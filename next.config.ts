import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['blackfly-causeless-camie.ngrok-free.dev'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'ngrok-skip-browser-warning', value: '1' },
          { key: 'bypass-tunnel-reminder', value: '1' },
        ],
      },
    ];
  },
};

export default nextConfig;
