import axios from "../utils/axiosConfig";
import { CheerioAPI, load as CheerioLoad } from "cheerio";
import { DHAKA_STOCK_URLS } from "../env";
import { Service } from "typedi";
import { redis } from "../config/redis"; // ✅ Redis import

@Service()
export class StockDataService {
  private async fetchAndParseHtml(
    url: string,
    params: any = {}
  ): Promise<CheerioAPI> {
    try {
      const response = await axios.get(url, { params });
      if (response.status !== 200) {
        throw new Error(`Failed to fetch data: Status Code ${response.status}`);
      }
      return CheerioLoad(response.data);
    } catch (error) {
      console.error("Error in fetchAndParseHtml:", error);
      throw error;
    }
  }

  private getCurrentTradingCodes($: CheerioAPI): string[] {
    const headers: string[] = [];
    $("table.table.table-bordered tr")
      .first()
      .find("th")
      .each((_, th) => {
        headers.push($(th).text().trim());
      });
    return headers;
  }

  async parseTableRows<T extends Record<string, any>>(
    $: CheerioAPI,
    selector: string,
    skipFirstRow: boolean = true
  ): Promise<T[]> {
    const headers = this.getCurrentTradingCodes($);
    const data: T[] = [];

    $(selector).each((index, element) => {
      if (index === 0 && skipFirstRow) return;

      const tds = $(element).find("td");
      let rowData: T = {} as T;

      headers.forEach((header, idx) => {
        // @ts-ignore
        rowData[header] = $(tds[idx]).text().trim().replace(",", "") as any;
      });

      data.push(rowData);
    });

    return data;
  }

  // ✅ Latest Stock Data (Cache 5 minutes)
  async getStockData(): Promise<any[]> {
    const cacheKey = "latest_stock_data";

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Latest stock data from cache");
      return JSON.parse(cached);
    }

    console.log("🌐 Fetching fresh latest stock data...");
    const url = DHAKA_STOCK_URLS.LATEST_DATA;
    const $ = await this.fetchAndParseHtml(url);
    const data = await this.parseTableRows<any>($, "table.table-bordered tr");

    await redis.set(cacheKey, JSON.stringify(data), "EX", 300);
    return data;
  }

  // ✅ DSEX Data (Cache 10 minutes)
  async getDsexData(symbol: string | undefined): Promise<any[]> {
    const cacheKey = `dsex_data_${symbol || "all"}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ DSEX data from cache");
      return JSON.parse(cached);
    }

    console.log("🌐 Fetching fresh DSEX data...");
    const url = DHAKA_STOCK_URLS.DSEX;

    try {
      const $ = await this.fetchAndParseHtml(url);
      let data = await this.parseTableRows<any>($, "table.table-bordered tr");

      if (symbol) {
        data = data.filter(
          (d) =>
            d["Symbol"] && d["Symbol"].toUpperCase() === symbol.toUpperCase()
        );
      }

      await redis.set(cacheKey, JSON.stringify(data), "EX", 600);
      return data;
    } catch (error) {
      console.error("Error fetching DSEX data:", error);
      return [];
    }
  }

  // ✅ Top 30 (Cache 10 minutes)
  async getTop30(): Promise<any[]> {
    const cacheKey = "top30_stock_data";

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Top 30 data from cache");
      return JSON.parse(cached);
    }

    console.log("🌐 Fetching fresh Top 30 data...");
    const url = DHAKA_STOCK_URLS.TOP_30;

    try {
      const $ = await this.fetchAndParseHtml(url);
      const data = await this.parseTableRows<any>($, "table.table-bordered tr");

      await redis.set(cacheKey, JSON.stringify(data), "EX", 600);
      return data;
    } catch (error) {
      console.error("Error fetching Top 30 data:", error);
      return [];
    }
  }

  // ✅ Historical Data (Cache 1 hour)
  async getHistData(
    start: string,
    end: string,
    code = "All Instrument"
  ): Promise<any[]> {
    const cacheKey = `hist_${start}_${end}_${code}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Historical data from cache");
      return JSON.parse(cached);
    }

    console.log("🌐 Fetching fresh historical data...");
    const url = DHAKA_STOCK_URLS.HISTORIACAL_DATA;
    const params = {
      startDate: start,
      endDate: end,
      inst: code,
      archive: "data",
    };

    const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    const $ = await this.fetchAndParseHtml(fullUrl);
    const data = await this.parseTableRows<any>(
      $,
      "table.table-bordered tbody tr",
      false
    );

    await redis.set(cacheKey, JSON.stringify(data), "EX", 3600);
    return data;
  }
}
