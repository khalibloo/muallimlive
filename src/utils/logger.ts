export default class Logger {
  static log = (message?: any, ...optionalParams: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log.call(console, message, ...optionalParams);
    }
  };

  static error = (message?: any, ...optionalParams: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.error.apply(message, ...optionalParams);
    }
  };

  static warn = (message?: any, ...optionalParams: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.warn.apply(message, ...optionalParams);
    }
  };
}
