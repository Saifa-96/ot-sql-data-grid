import { faker } from "@faker-js/faker";

interface Column {
  name: string;
  width: number;
}

export function genHeader(): Column[] {
  return [
    {
      name: "id",
      width: 80,
    },
    {
      name: "wechatId",
      width: 80,
    },
    {
      name: "name",
      width: 120,
    },
    {
      name: "gender",
      width: 80,
    },
    {
      name: "phone",
      width: 150,
    },
    {
      name: "email",
      width: 200,
    },
    {
      name: "birthday",
      width: 150,
    },
    {
      name: "createTime",
      width: 150,
    },
  ];
}

function genUserItem() {
  return {
    id: faker.string.uuid().slice(0, 7),
    wechatId: faker.string.uuid().slice(0, 7),
    name: faker.person.fullName(),
    gender: faker.person.sexType(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    birthday: faker.date.birthdate(),
    createTime: faker.date.anytime(),
  };
}

export function genData() {
  return Array(100).fill(null).map(genUserItem);
}
