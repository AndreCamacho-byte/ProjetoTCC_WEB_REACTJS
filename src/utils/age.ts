import type { User } from "@/types/user";

// Idade mínima para usar os spots/encontros e o marketplace (a mesma regra existe no backend)
export const MIN_AGE = 12;

// - UNVERIFIED: conta sem data de nascimento (criada antes de o cadastro pedir)
// - UNDERAGE: menor de 12 anos
// - OK: liberada
export type AgeStatus = "UNVERIFIED" | "UNDERAGE" | "OK";

// Idade em anos completos a partir da data que vem da API ("2005-05-12T00:00:00.000Z")
export function ageFrom(birthDate: string, today = new Date()) {
  const [year, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  let age = today.getFullYear() - year;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export function ageStatus(user: Pick<User, "birthDate">): AgeStatus {
  if (!user.birthDate) return "UNVERIFIED";
  return ageFrom(user.birthDate) < MIN_AGE ? "UNDERAGE" : "OK";
}

// "2005-05-12T00:00:00.000Z" -> "12/05/2005"
export function formatBirthDate(birthDate: string) {
  const [year, month, day] = birthDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
