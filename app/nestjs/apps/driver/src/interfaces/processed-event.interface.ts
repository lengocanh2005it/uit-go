export interface ProcessedEventKey {
  eventId: string;
}

export interface ProcessedEvent extends ProcessedEventKey {
  createdAt: Date;
}
