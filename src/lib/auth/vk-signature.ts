import { createHmac } from 'crypto';

/**
 * Validates the HMAC-SHA256 signature of VK Mini App launch params.
 *
 * VK passes signed query params on Mini App launch, e.g.:
 *   vk_user_id=123&vk_app_id=456&...&sign=<base64url>
 *
 * Validation algorithm:
 * 1. Collect params whose key starts with "vk_"
 * 2. Sort by key alphabetically
 * 3. Build "key=value&..." string
 * 4. HMAC-SHA256 with the VK app client_secret
 * 5. Base64url-encode → compare with "sign" param
 */
export function validateVkSignature(queryString: string, clientSecret: string): boolean {
    const params = new URLSearchParams(queryString);
    const sign = params.get('sign');
    if (!sign) return false;

    const vkParams = [...params.entries()]
        .filter(([key]) => key.startsWith('vk_'))
        .sort(([a], [b]) => a.localeCompare(b));

    const payload = vkParams.map(([k, v]) => `${k}=${v}`).join('&');

    const expected = createHmac('sha256', clientSecret)
        .update(payload)
        .digest('base64url');

    console.log('[vk-signature] payload:', payload);
    console.log('[vk-signature] expected:', expected);
    console.log('[vk-signature] received:', sign);
    console.log('[vk-signature] match:', expected === sign);

    return expected === sign;
}
