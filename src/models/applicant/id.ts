export interface ApplicantID {
  value: string
}

export function ApplicantID(value: string): ApplicantID {
  return { value }
}
