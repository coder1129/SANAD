/**
 * Field name the backend's upload endpoints read the file from. Sending any
 * other name makes the request fail validation before it reaches a handler.
 */
export const FILE_FIELD_NAME = 'file';

/**
 * Builds a multipart body for an upload request.
 *
 * Pass the result straight through as the request body — never set
 * `Content-Type` alongside it, or the multipart boundary the runtime generates
 * is lost and the backend cannot parse the parts.
 */
export function createFileFormData(
  file: File,
  fields?: Record<string, string>,
): FormData {
  const formData = new FormData();
  formData.append(FILE_FIELD_NAME, file);

  for (const [key, value] of Object.entries(fields ?? {})) {
    formData.append(key, value);
  }

  return formData;
}
