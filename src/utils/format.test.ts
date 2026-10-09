import { describe, expect, it } from "vitest";
import { formatBRL, formatCep, formatDate, orderNumber, parsePrice } from "./format";
import { dataUrlBytes } from "./image";

// O Intl separa "R$" do número com um espaço que não quebra linha
const plain = (text: string) => text.replace(/ /g, " ");

describe("formatBRL", () => {
  it("mostra o preço em reais", () => {
    expect(plain(formatBRL(119.9))).toBe("R$ 119,90");
    expect(plain(formatBRL(1250))).toBe("R$ 1.250,00");
    expect(plain(formatBRL(0))).toBe("R$ 0,00");
  });
});

describe("formatCep", () => {
  it("coloca o traço enquanto a pessoa digita", () => {
    expect(formatCep("01310")).toBe("01310");
    expect(formatCep("013101")).toBe("01310-1");
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("ignora o que não é número e o que passa de 8 dígitos", () => {
    expect(formatCep("01.310-100abc")).toBe("01310-100");
    expect(formatCep("013101009999")).toBe("01310-100");
  });
});

describe("parsePrice", () => {
  it("entende vírgula, ponto e separador de milhar", () => {
    expect(parsePrice("119,90")).toBe(119.9);
    expect(parsePrice("119.90")).toBe(119.9);
    expect(parsePrice("R$ 1.119,90")).toBe(1119.9);
    expect(parsePrice("80")).toBe(80);
  });

  it("recusa o que não é um preço", () => {
    for (const text of ["", "abc", "0", "-5", "10,999", "1,2,3"]) {
      expect(parsePrice(text)).toBeNull();
    }
  });
});

describe("formatDate e orderNumber", () => {
  it("mostra a data no formato brasileiro", () => {
    expect(formatDate("2026-10-09T15:00:00.000Z")).toBe("09/10/2026");
  });

  it("encurta o id do pedido", () => {
    expect(orderNumber("66666666-6666-4666-8666-666666666666")).toBe("#66666666");
    expect(orderNumber("ab12cd34-0000-4000-8000-000000000000")).toBe("#AB12CD34");
  });
});

describe("dataUrlBytes", () => {
  it("calcula o tamanho do arquivo dentro da data URL", () => {
    // "Clutch" tem 6 bytes; "Clut" tem 4 (com preenchimento "==")
    expect(dataUrlBytes(`data:image/jpeg;base64,${btoa("Clutch")}`)).toBe(6);
    expect(dataUrlBytes(`data:image/jpeg;base64,${btoa("Clut")}`)).toBe(4);
  });
});
