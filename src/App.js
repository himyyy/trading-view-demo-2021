import { useEffect } from "react";
import pako from "pako";
import { widget, version } from "./charting_library.esm";
import { DataFeeds } from "./datafeed";

const ws_url = "wss://www.huobi.pe/-/s/pro/ws";

function App() {
  console.log(version());

  useEffect(() => {
    const ws = new WebSocket(ws_url);
    const store = {
      ws,
      onRealTimeCallback: null,
      onHistoryCallback: null,
    };

    ws.onmessage = (event) => {
      const reader = new FileReader();

      reader.onload = () => {
        const res = JSON.parse(pako.ungzip(reader.result, { to: "string" }));

        if (res.ping) store.ws.send(JSON.stringify({ pong: new Date().getTime() }));

        if (res.rep) {
          let datas = [];
          for (let data of res.data) {
            datas.push({
              time: data.id * 1000,
              close: data.close,
              open: data.open,
              high: data.high,
              low: data.low,
              volume: data.amount,
            });
          }

          store.onHistoryCallback(datas, { noData: !datas.length });
        }

        if (res.tick) {
          const data = res.tick;

          store.onRealTimeCallback({
            time: data.id * 1000,
            volume: data.amount,
            close: data.close,
            open: data.open,
            high: data.high,
            low: data.low,
          });
        }
      };

      reader.readAsArrayBuffer(event.data);
    };

    new widget({
      symbol: "btcusdt",
      interval: "5",
      timezone: "Asia/Shanghai",
      container: "tv_chart_container",
      fullscreen: true,
      locale: "en",
      datafeed: new DataFeeds(store),
      library_path: "/charting_library/",
    });
  }, []);

  return <div className="App" id="tv_chart_container"></div>;
}

export default App;
