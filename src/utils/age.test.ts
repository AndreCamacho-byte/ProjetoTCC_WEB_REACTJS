import { describe, expect, it } from "vitest";
import { MIN_AGE, ageFrom, ageStatus, formatBirthDate } from "./age";

// Data de nascimento de quem completa `years` anos hoje (ou daqui a `daysUntilBirthday` dias)
function bornYearsAgo(years: number, daysUntilBirthday = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + daysUntilBirthday);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00.000Z`;
}

describe("ageFrom", () => {
  const today = new Date(2026, 9, 2); // 2 de outubro de 2026

  it("conta os anos completos", () => {
    expect(ageFrom("2000-01-15T00:00:00.000Z", today)).toBe(26);
  });

  it("já conta o ano no dia do aniversário", () => {
    expect(ageFrom("2014-10-02T00:00:00.000Z", today)).toBe(12);
  });

  it("não conta o ano se o aniversário é amanhã", () => {
    expect(ageFrom("2014-10-03T00:00:00.000Z", today)).toBe(11);
  });
});

describe("ageStatus", () => {
  it("sem data de nascimento a idade fica como não verificada", () => {
    expect(ageStatus({ birthDate: null })).toBe("UNVERIFIED");
  });

  it("bloqueia menores de 12 anos", () => {
    expect(ageStatus({ birthDate: bornYearsAgo(10) })).toBe("UNDERAGE");
  });

  it("bloqueia quem só faz 12 anos amanhã", () => {
    expect(ageStatus({ birthDate: bornYearsAgo(MIN_AGE, 1) })).toBe("UNDERAGE");
  });

  it("libera quem faz 12 anos hoje", () => {
    expect(ageStatus({ birthDate: bornYearsAgo(MIN_AGE) })).toBe("OK");
  });

  it("libera adultos", () => {
    expect(ageStatus({ birthDate: bornYearsAgo(30) })).toBe("OK");
  });
});

describe("formatBirthDate", () => {
  it("mostra a data no formato brasileiro", () => {
    expect(formatBirthDate("2005-05-12T00:00:00.000Z")).toBe("12/05/2005");
  });
});
