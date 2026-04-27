/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 配置 WASM 文件的处理
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // 对于服务器端，将 sql.js 添加到 externals 中
    // 这样 webpack 不会打包它，而是让 Node.js 直接 require 它
    // 这样 sql.js 就能找到它自己的 WASM 文件
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'sql.js',
      ];
    }
    
    return config;
  },
};

module.exports = nextConfig;
