import { faker } from "@faker-js/faker";

export interface Column {
  id: string;
  name: string;
  displayName: string;
  width: number;
  orderBy: number;
  type: string;
}

export function genHeader(): Column[] {
  return [
    // {
    //   id: 'id',
    //   name: "id",
    //   displayName: 'ID',
    //   width: 80,
    //   orderBy: 0,
    //   type: 'TEXT'
    // },
    {
      id: 'wid',
      name: "wid",
      displayName: 'Wechat ID',
      width: 200,
      orderBy: 1,
      type: 'TEXT'
    },
    {
      id: 'name',
      name: "name",
      displayName: 'Name',
      width: 120,
      orderBy: 2,
      type: 'TEXT'
    },
    {
      id: 'gender',
      name: "gender",
      displayName: 'Gender',
      width: 80,
      orderBy: 3,
      type: 'TEXT'
    },
    {
      id: 'phone',
      name: "phone",
      width: 150,
      displayName: 'Phone',
      orderBy: 4,
      type: 'TEXT'
    },
    {
      id: 'email',
      name: "email",
      width: 200,
      displayName: 'Email',
      orderBy: 5,
      type: 'TEXT'
    },
    {
      id: 'birthday',
      name: "birthday",
      width: 150,
      displayName: 'Birthday',
      orderBy: 6,
      type: 'TEXT'
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
