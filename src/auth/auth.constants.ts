export const SESSION_COOKIE = 'sid';

// 登入與修改密碼每個 IP 每分鐘可嘗試的次數
export const AUTH_RATE_LIMIT = {
  default: {
    limit: () => Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? 5),
    ttl: 60_000,
  },
};
