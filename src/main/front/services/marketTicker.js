export const MARKET_TICKER_UPDATED_EVENT = 'market-ticker:updated';

export const notifyMarketTickerUpdate = ({ refresh = false } = {}) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(MARKET_TICKER_UPDATED_EVENT, { detail: { refresh } }));
    }
};
