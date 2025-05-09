import { faker } from "@faker-js/faker";
import { ColumnItem } from "sql-store";
import { v4 as uuid } from "uuid";

export const defaultColumnItems: ColumnItem[] = [
  {
    fieldName: "name",
    displayName: "Name",
    width: 200,
    orderBy: 10000,
  },
  {
    fieldName: "age",
    displayName: "Age",
    width: 100,
    orderBy: 20000,
  },
  {
    fieldName: "address",
    displayName: "Address",
    width: 300,
    orderBy: 30000,
  },
  {
    fieldName: "phone",
    displayName: "Phone",
    width: 200,
    orderBy: 40000,
  },
  {
    fieldName: "email",
    displayName: "Email",
    width: 200,
    orderBy: 50000,
  },
  {
    fieldName: "birthday",
    displayName: "Birthday",
    width: 150,
    orderBy: 60000,
  },
];

const generateRow = () => [
  faker.person.fullName(),
  faker.number.int({ min: 18, max: 99 }),
  faker.location.streetAddress(),
  faker.phone.number(),
  faker.internet.email(),
  faker.date.birthdate().toDateString(),
];

const generateTableData = (count: number) => ({
  ids: Array(count)
    .fill(null)
    .map(() => uuid()),
  values: Array(count).fill(null).map(generateRow),
});

export const defaultTableData = generateTableData(30000);
