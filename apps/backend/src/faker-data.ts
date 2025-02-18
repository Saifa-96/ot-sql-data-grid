import { faker } from "@faker-js/faker";

export interface Column {
  id: string;
  name: string;
  width: number;
}

export function genHeader(): Column[] {
  return [
    {
      id: 'id',
      name: "id",
      width: 80,
    },
    {
      id: 'wechatId',
      name: "wechatId",
      width: 80,
    },
    {
      id: 'name',
      name: "name",
      width: 120,
    },
    {
      id: 'gender',
      name: "gender",
      width: 80,
    },
    {
      id: 'phone',
      name: "phone",
      width: 150,
    },
    {
      id: 'email',
      name: "email",
      width: 200,
    },
    {
      id: 'birthday',
      name: "birthday",
      width: 150,
    },
    {
      id: 'createTime',
      name: "createTime",
      width: 150,
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
    create_time: faker.date.anytime().toDateString(),
  };
}
export type DataItem = Record<string, string>;

export function genData(count: number = 30000) {
  return Array(count).fill(null).map(genUserItem);
}
