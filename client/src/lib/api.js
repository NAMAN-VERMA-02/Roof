export async function api(path, options = {}) {
  const { body, ...rest } = options;
  const isForm = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      ...(isForm ? {} : body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...rest.headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed.');
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

export function friendlyError(error) {
  if (error?.details?.length) return `${error.message} ${error.details[0].message}`;
  return error?.message || 'Something went wrong. Please try again.';
}
