const API_URL = '/api/payments';

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const depositEscrow = async (token, payload) => {
  const res = await fetch(`${API_URL}/escrow`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Payment failed');
  return data;
};

export const sendPaymentOTP = async (token, amount, currency) => {
  const res = await fetch(`${API_URL}/send-otp`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ amount, currency }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
  return data;
};
