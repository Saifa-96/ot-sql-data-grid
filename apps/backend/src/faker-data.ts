import { faker } from "@faker-js/faker";

export interface Column {
  id: string;
  fieldName: string;
  fieldType: string;
  displayName: string;
  width: number;
  orderBy: number;
}

export function genHeader(): Column[] {
  return [
    {
      id: 'wid',
      fieldName: "wid",
      displayName: 'Wechat ID',
      width: 150,
      orderBy: 10000,
      fieldType: 'TEXT'
    },
    {
      id: 'name',
      fieldName: "name",
      displayName: 'Name',
      width: 200,
      orderBy: 20000,
      fieldType: 'TEXT'
    },
    {
      id: 'gender',
      fieldName: "gender",
      displayName: 'Gender',
      width: 100,
      orderBy: 30000,
      fieldType: 'TEXT'
    },
    {
      id: 'phone',
      fieldName: "phone",
      width: 200,
      displayName: 'Phone',
      orderBy: 40000,
      fieldType: 'TEXT'
    },
    {
      id: 'email',
      fieldName: "email",
      width: 200,
      displayName: 'Email',
      orderBy: 50000,
      fieldType: 'TEXT'
    },
    {
      id: 'birthday',
      fieldName: "birthday",
      width: 150,
      displayName: 'Birthday',
      orderBy: 60000,
      fieldType: 'TEXT'
    },
  ];
}

export function genUserItem() {
  return {
    id: faker.string.uuid(),
    wid: faker.string.uuid(),
    name: faker.person.fullName(),
    gender: faker.person.sexType(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    birthday: faker.date.birthdate().toDateString(),
  };
}
export type DataItem = Record<string, string>;

export function genData(count: number = 30000) {
  return Array(count).fill(null).map(genUserItem);
}
