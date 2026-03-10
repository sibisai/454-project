"""
security_alert/handler.py — Security alert Lambda function.

Triggered when repeated failed login attempts are detected.
Sends an alert notification via SNS to the security team
and optionally locks the affected account.
"""
