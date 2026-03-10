"""
audit_processor/handler.py — Audit event processor Lambda function.

Triggered by CloudWatch Events / EventBridge when audit events occur.
Processes and enriches audit log entries for long-term storage
and compliance reporting.
"""
