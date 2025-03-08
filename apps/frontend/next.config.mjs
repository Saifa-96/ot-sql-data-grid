/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.fallback = { fs: false };
        return config;
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    }
                ]
            }
        ]
    }
};

export default nextConfig;
