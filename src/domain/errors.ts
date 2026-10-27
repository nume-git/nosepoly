export type DomainErrorCode =
  | "not_admin"
  | "not_creator"
  | "not_jury"
  | "account_deleted"
  | "own_prediction"
  | "invalid_state"
  | "invalid_value"
  | "invalid_text"
  | "round_not_collecting"
  | "round_closed"
  | "round_has_pending"
  | "round_already_collecting"
  | "prediction_limit";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
