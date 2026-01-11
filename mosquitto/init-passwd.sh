#!/bin/sh
# ==========================================
# MQTT Password Initialization Script
# Creates password file for Mosquitto
# ==========================================

set -e

echo "Initializing MQTT password file..."

# Wait for mosquitto to be ready
sleep 2

# Create password file if it doesn't exist
if [ ! -f /mosquitto/config/passwd ]; then
    echo "Creating new password file..."
    touch /mosquitto/config/passwd
fi

# Add user with password from environment
# Username: growuser (from MQTT_USERNAME)
# Password: from MQTT_PASSWORD
if [ -n "$MQTT_USERNAME" ] && [ -n "$MQTT_PASSWORD" ]; then
    echo "Adding user: $MQTT_USERNAME"
    mosquitto_passwd -b /mosquitto/config/passwd "$MQTT_USERNAME" "$MQTT_PASSWORD"
    echo "Password file created successfully"
else
    echo "WARNING: MQTT_USERNAME or MQTT_PASSWORD not set!"
    exit 1
fi

# Set proper permissions
chmod 0700 /mosquitto/config/passwd
chown mosquitto:mosquitto /mosquitto/config/passwd

echo "MQTT authentication configured successfully"
