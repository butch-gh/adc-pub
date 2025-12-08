declare module 'express-http-proxy' {
  interface ProxyOptions {
    timeout?: number;
    proxyReqPathResolver?: (req: any) => string;
    proxyReqOptDecorator?: (proxyReqOpts: any, srcReq: any) => any;
    userResDecorator?: (proxyRes: any, proxyResData: any, userReq: any, userRes: any) => any;
    proxyErrorHandler?: (err: any, res: any, next: any) => void;
  }
  function proxy(targetUrl: string, options?: ProxyOptions): any;
  export = proxy;
}