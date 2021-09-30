const resolutionFormat = (resolution, name, to) => {
  let req = `market.${name}.kline.${resolution}min`;
  let minutes = resolution;

  if (resolution.includes("D")) {
    if (resolution.length < 2) resolution = "1" + resolution;
    req = `market.${name}.kline.${parseInt(resolution)}day`;
    minutes = parseInt(resolution) * 24 * 60;
  } else if (resolution.includes("W")) {
    if (resolution.length < 2) resolution = "1" + resolution;
    req = `market.${name}.kline.${parseInt(resolution)}week`;
    minutes = parseInt(resolution) * 24 * 60 * 7;
  } else if (resolution.includes("M")) {
    if (resolution.length < 2) resolution = "1" + resolution;
    req = `market.${name}.kline.${parseInt(resolution)}mon`;
    minutes = parseInt(resolution) * 24 * 60 * 30;
  } else {
    if (resolution / 60 > 1) {
      req = `market.${name}.kline.${resolution / 60}hour`;
    }
  }

  let from = null;
  if (to) {
    from = to - 200 * minutes * 60;
    if (resolution.includes("M") || resolution.includes("W")) {
      // 周线月线控制条数，时间超出火币规定范围, ws报错
      from = to - 50 * minutes * 60;
    }
  }

  return {
    minutes,
    req,
    from,
    to,
  };
};

export const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "240", "1D", "1M"];

export class DataFeeds {
  constructor(store) {
    this.store = store;
    this.ws = store.ws;
  }

  onReady(callback) {
    callback({
      supported_resolutions: SUPPORTED_RESOLUTIONS,
    });
  }

  getBars(
    symbolInfo,
    resolution,
    { firstDataRequest, from: rangeStartDate, to: rangeEndDate },
    onHistoryCallback,
    onErrorCallback
  ) {
    if (firstDataRequest) this.store.to = null;

    this.store.onHistoryCallback = onHistoryCallback;

    const to = this.store.to || rangeEndDate;
    const reso = resolutionFormat(resolution, symbolInfo.name, to);
    this.store.to = reso.from;

    if (this.store.sub) {
      this.store.prevSub = this.store.sub;
      // 解决unSub方法会有延迟
      this.ws.send(
        JSON.stringify({
          unsub: this.store.prevSub,
          id: "id12",
        })
      );
    }

    this.store.sub = reso.req;

    if (this.ws) {
      const that = this;
      let timer = setInterval(() => {
        try {
          if (this.ws.readyState === 1) {
            clearInterval(timer);
            timer = null;
            that.ws.send(
              JSON.stringify({
                req: reso.req,
                id: "id10",
                from: reso.from,
                to: reso.to,
              })
            );
          }
        } catch (err) {
          console.log(err);
        }
      }, 500);
    }
  }

  subscribeBars(symbolInfo, resolution, onRealTimeCallback, listenerGUID, onResetCacheNeededCallback) {
    this.store.onRealTimeCallback = onRealTimeCallback;

    this.ws.send(
      JSON.stringify({
        sub: this.store.sub,
        id: "id11",
      })
    );
  }

  unsubscribeBars() {
    // this.ws.send(
    //   JSON.stringify({
    //     unsub: this.store.prevSub,
    //     id: "id12",
    //   })
    // );
  }

  resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
    onSymbolResolvedCallback({
      timezone: "Asia/Shanghai",
      minmov: 1,
      minmov2: 0,
      pointvalue: 1,
      session: "24x7",
      has_seconds: false,
      has_daily: true,
      has_weekly_and_monthly: true,
      has_no_volume: false,
      has_empty_bars: true,
      description: "",
      has_intraday: true,
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      volume_precision: 3, //数量精度
      symbol: symbolName,
      ticker: symbolName,
      name: symbolName,
      pricescale: Math.pow(10, 4) || 8,
      volume_precision: 3 || 3,
    });
  }
}

export default DataFeeds;
