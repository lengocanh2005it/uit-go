export interface AWSQueueMessage<T = any> {
  queueName: string;
  payload: T;
  replyTo: string;
}
