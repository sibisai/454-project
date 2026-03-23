"""
security_alert/handler.py -- Security alert Lambda function.

Triggered by a CloudWatch Logs subscription filter when CloudTrail
events arrive. Filters for suspicious activity (unauthorized access,
root usage, security group and IAM changes) and optionally sends
alerts via SNS.
"""

import base64
import gzip
import json
import logging
import os

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Event names that indicate security-relevant changes
SECURITY_GROUP_EVENTS = {
    "AuthorizeSecurityGroupIngress",
    "AuthorizeSecurityGroupEgress",
    "RevokeSecurityGroupIngress",
    "RevokeSecurityGroupEgress",
    "CreateSecurityGroup",
    "DeleteSecurityGroup",
}

IAM_POLICY_EVENTS = {
    "CreatePolicy",
    "DeletePolicy",
    "AttachUserPolicy",
    "DetachUserPolicy",
    "AttachRolePolicy",
    "DetachRolePolicy",
    "AttachGroupPolicy",
    "DetachGroupPolicy",
    "PutUserPolicy",
    "PutRolePolicy",
    "PutGroupPolicy",
}


def is_suspicious(ct_event):
    """Check if a CloudTrail event is suspicious."""
    event_name = ct_event.get("eventName", "")
    error_code = ct_event.get("errorCode", "")
    user_identity = ct_event.get("userIdentity", {})

    # Root account usage
    if user_identity.get("type") == "Root":
        return True, "Root account usage"

    # Unauthorized API calls
    if "UnauthorizedAccess" in error_code or "AccessDenied" in error_code:
        return True, f"Unauthorized API call ({error_code})"

    # Console login (may be from unusual IP)
    if event_name == "ConsoleLogin":
        return True, "Console login detected"

    # Security group changes
    if event_name in SECURITY_GROUP_EVENTS:
        return True, f"Security group change ({event_name})"

    # IAM policy changes
    if event_name in IAM_POLICY_EVENTS:
        return True, f"IAM policy change ({event_name})"

    return False, ""


def lambda_handler(event, context):
    """Filter CloudTrail events for suspicious activity and alert via SNS."""
    try:
        # CloudWatch Logs delivers events as base64-encoded gzip
        compressed = base64.b64decode(event["awslogs"]["data"])
        log_data = json.loads(gzip.decompress(compressed))

        log_events = log_data.get("logEvents", [])
        suspicious_events = []

        for log_event in log_events:
            try:
                ct_event = json.loads(log_event["message"])
            except (json.JSONDecodeError, KeyError):
                continue

            suspicious, reason = is_suspicious(ct_event)
            if suspicious:
                alert = {
                    "reason": reason,
                    "eventName": ct_event.get("eventName"),
                    "eventSource": ct_event.get("eventSource"),
                    "sourceIPAddress": ct_event.get("sourceIPAddress"),
                    "userIdentity": ct_event.get("userIdentity"),
                    "eventTime": ct_event.get("eventTime"),
                }
                logger.warning("SUSPICIOUS: %s", json.dumps(alert))
                suspicious_events.append(alert)

        logger.info(
            "Found %d suspicious events out of %d",
            len(suspicious_events),
            len(log_events),
        )

        # Send SNS alert if configured and suspicious events found
        sns_topic_arn = os.environ.get("SNS_TOPIC_ARN", "")
        if sns_topic_arn and suspicious_events:
            sns = boto3.client("sns")
            sns.publish(
                TopicArn=sns_topic_arn,
                Subject=f"Security Alert: {len(suspicious_events)} suspicious event(s)",
                Message=json.dumps(suspicious_events, indent=2),
            )
            logger.info("Alert published to SNS topic %s", sns_topic_arn)

        return {
            "statusCode": 200,
            "body": f"Found {len(suspicious_events)} suspicious events out of {len(log_events)}",
        }

    except Exception:
        logger.exception("Failed to process CloudWatch Logs event")
        raise
