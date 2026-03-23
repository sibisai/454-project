"""
audit_processor/handler.py -- Audit event processor Lambda function.

Triggered by a CloudWatch Logs subscription filter when CloudTrail
events arrive. Decodes the base64+gzip log payload, parses each
event, and logs key fields for auditing. In production you would
write these to DynamoDB or trigger downstream alerts.
"""

import base64
import gzip
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """Process CloudTrail audit events from CloudWatch Logs."""
    try:
        # CloudWatch Logs delivers events as base64-encoded gzip
        compressed = base64.b64decode(event["awslogs"]["data"])
        log_data = json.loads(gzip.decompress(compressed))

        log_events = log_data.get("logEvents", [])

        for log_event in log_events:
            try:
                message = json.loads(log_event["message"])
                logger.info(json.dumps({
                    "eventName": message.get("eventName"),
                    "eventSource": message.get("eventSource"),
                    "sourceIPAddress": message.get("sourceIPAddress"),
                    "userIdentity": message.get("userIdentity"),
                    "eventTime": message.get("eventTime"),
                }))
            except (json.JSONDecodeError, KeyError):
                # Some log events may not be valid CloudTrail JSON
                logger.warning("Skipping non-JSON log event: %s", log_event.get("message", ""))

        logger.info("Processed %d CloudTrail events", len(log_events))
        return {"statusCode": 200, "body": f"Processed {len(log_events)} events"}

    except Exception:
        logger.exception("Failed to process CloudWatch Logs event")
        raise
