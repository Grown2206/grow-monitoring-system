FROM eclipse-mosquitto:2.0

# Copy configuration
COPY config/mosquitto.conf /mosquitto/config/mosquitto.conf

# Create password file with user from environment
# This will be populated by docker-compose entrypoint
RUN touch /mosquitto/config/passwd && \
    chmod 0700 /mosquitto/config/passwd

# Expose MQTT and WebSocket ports
EXPOSE 1883 9001

# Set proper permissions
RUN chown -R mosquitto:mosquitto /mosquitto

# Use default mosquitto entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
