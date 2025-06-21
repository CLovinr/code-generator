import { defineStore } from "pinia";

export const CONFIG_DIR_BASE_NAME = "codeGEN";

declare const acquireVsCodeApi: () => {
  postMessage: (data: any) => any;
};

export const useVsCodeApiStore = defineStore("vsCodeApi", () => {
  const vscode =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;

  const listeners: any = {};
  const waitResponseQueue: Array<{
    time: number;
    type: string;
    rid: string;
    resolve: Function;
    reject: Function;
  }> = [];
  let processing = false;
  let idCount = 0;

  window.addEventListener("message", (event) => {
    const message = event.data;
    // console.log("*******message: ", typeof message, message);
    if (message.type && message.type.startsWith("extension.")) {
      const type = (message.type as string).substring("extension.".length);
      if (message.responseId) {
        processResponse(type, message);
      }

      if (listeners[type]) {
        for (const func of listeners[type]) {
          try {
            // console.log("call listener: type=", type);
            func(message.data);
          } catch (e) {
            console.error(`process message error: type=${type}`, e);
          }
        }
      }
    }
  });

  function processResponse(type: string, message: any) {
    const responseId: string = message.responseId;
    let found = false;
    for (let i = 0; i < waitResponseQueue.length; i++) {
      const item = waitResponseQueue[i];
      if (item.rid === responseId) {
        found = true;
        try {
          waitResponseQueue.splice(i, 1);
          if (message.failed) {
            item.reject(new Error(message.errmsg));
          } else {
            item.resolve(message.data);
          }
        } catch (e) {
          console.error("process response error: ", e);
        } finally {
          break;
        }
      }
    }

    if (!found) {
      console.warn("not found response handle: ", message);
    }
  }

  function processQueue(timeout: number = 30 * 1000) {
    if (processing) {
      return;
    }

    processing = true;

    const procFun = () => {
      let minDT = undefined;
      for (let i = 0; i < waitResponseQueue.length; i++) {
        const item = waitResponseQueue[i];
        const dt = new Date().getTime() - item.time;
        try {
          if (dt >= timeout) {
            item.reject(new Error(`wait response timeout: type=${item.type}`));
            waitResponseQueue.splice(i--, 1);
          } else {
            if (minDT === undefined || minDT > dt) {
              minDT = dt;
            }
          }
        } catch (e) {
          console.error("process queue error: ", e);
          waitResponseQueue.splice(i--, 1);
        }
      }

      if (minDT) {
        setTimeout(procFun, minDT / 2);
      } else {
        processing = false;
      }
    };

    setTimeout(procFun, timeout / 3);
  }

  function initReady() {
    sendMessage("initReady");
  }

  function sendMessage(type: string, data?: any) {
    vscode?.postMessage({
      type: `extension.${type}`,
      data,
    });
  }

  function request(type: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!vscode) {
        reject(new Error("not found acquireVsCodeApi"));
        return;
      }

      try {
        const rid = `wv-rid-${++idCount}`;

        waitResponseQueue.push({
          time: new Date().getTime(),
          type,
          rid,
          resolve,
          reject,
        });

        vscode.postMessage({
          rid,
          type: `extension.${type}`,
          data,
        });

        processQueue();
      } catch (e) {
        reject(e);
      }
    });
  }

  function onMessage(type: string | string[], listener: (data: any) => void) {
    const types: any = {};
    if (typeof type === "string") {
      types[type] = true;
    } else {
      for (const t of type) {
        types[t] = true;
      }
    }

    for (const t of Object.keys(types)) {
      if (!listeners[t]) {
        listeners[t] = [];
      }

      listeners[t].push(listener);
    }
  }

  return { initReady, request, sendMessage, onMessage };
});
