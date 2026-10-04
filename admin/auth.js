export function adminSignInOptions(origin) {
  const preview = /^https:\/\/atm-town-[a-z0-9-]+-colton-adams-s-projects\.vercel\.app$/.test(origin);
  const returnOrigin = preview
    ? 'https://atm-town-web-git-admin-arcade-rewards-colton-adams-s-projects.vercel.app'
    : origin;
  return { shouldCreateUser: false, emailRedirectTo: `${returnOrigin}/admin/` };
}
export async function sendAdminSignInLink(client, email, origin) {
  const address = String(email || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(address)) throw new Error('Enter the email you use for ATM Town.');
  const { error } = await client.auth.signInWithOtp({ email: address, options: adminSignInOptions(origin) });
  if (error) throw error;
}
