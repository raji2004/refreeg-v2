export type ServiceStatus = "operational" | "unavailable";

export type HealthStatus = "operational" | "unavailable";

export type HealthCheckResponse = {
  status: HealthStatus;
  services: {
    database: ServiceStatus;
    bookings: ServiceStatus;
    payments: ServiceStatus;
  };
  timestamp: string;
};
