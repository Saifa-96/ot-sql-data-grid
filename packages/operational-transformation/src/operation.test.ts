import { describe, expect, test } from "@jest/globals";
import { clone } from "lodash";
import { compose, transform } from "./operation";

describe("utils module", () => {
  test("compose function", () => {
    expect(
      compose(
        {
          deleteRows: [{ symbol: "1" }],
          deleteCols: [{ uuid: "col2" }],
        },
        {
          updateCells: [
            { colId: { uuid: "col1" }, rowId: { symbol: "1" }, value: "123" },
            { colId: { uuid: "col2" }, rowId: { symbol: "3" }, value: "123" },
          ],
        }
      )
    ).toEqual({
      deleteRows: [{ symbol: "1" }],
      deleteCols: [{ uuid: "col2" }],
    });

    expect(
      compose(
        {
          updateCells: [
            { colId: { uuid: "col1" }, rowId: { symbol: "1" }, value: "123" },
            { colId: { uuid: "col1" }, rowId: { symbol: "2" }, value: "2" },
            { colId: { uuid: "col2" }, rowId: { symbol: "3" }, value: "123" },
          ],
        },
        {
          updateCells: [
            { colId: { uuid: "col1" }, rowId: { symbol: "1" }, value: "1" },
            { colId: { uuid: "col2" }, rowId: { symbol: "3" }, value: "3" },
          ],
        }
      )
    ).toEqual({
      updateCells: [
        { colId: { uuid: "col1" }, rowId: { symbol: "1" }, value: "1" },
        { colId: { uuid: "col2" }, rowId: { symbol: "3" }, value: "3" },
        { colId: { uuid: "col1" }, rowId: { symbol: "2" }, value: "2" },
      ],
    });
  });

  test("transform function", () => {
    interface User {
      id: string;
      name: string;
      age: string;
      gender: string;
    }

    const serverDoc: User[] = [
      { id: "1", name: "Bob", age: "10", gender: "male" },
      { id: "2", name: "Andy", age: "20", gender: "male" },
      { id: "3", name: "Alice", age: "12", gender: "female" },
      { id: "4", name: "David", age: "24", gender: "male" },
    ];

    const ClientDoc: User[] = clone(serverDoc);

    expect(
      transform(
        // the operation in the padding list.
        {
          deleteCols: [{ uuid: "age" }],
          updateCells: [
            { colId: { uuid: "name" }, rowId: { uuid: "1" }, value: "Tom" },
            { colId: { uuid: "name" }, rowId: { uuid: "2" }, value: "Jerry" },
            { colId: { uuid: "gender" }, rowId: { uuid: "2" }, value: "female" },
            { colId: { uuid: "name" }, rowId: { uuid: "3" }, value: "May" },
          ],
        },
        // the operation which received from another client side.
        {
          insertRows: [
            {
              id: { uuid: "0" },
              data: [
                { colId: { uuid: "name" }, value: "Capybara" },
                { colId: { uuid: "age" }, value: "12" },
                { colId: { uuid: "gender" }, value: "male" },
              ],
            },
          ],
          updateCells: [
            { colId: { uuid: "name" }, rowId: { uuid: "2" }, value: "Smith" },
            { colId: { uuid: "age" }, rowId: { uuid: "2" }, value: "30" },
          ],
          deleteRows: [{ uuid: "1" }],
        }
      )
    ).toEqual([
      // the operation will sent to the server side.
      {
        deleteCols: [{ uuid: "age" }],
        updateCells: [
          { colId: { uuid: "name" }, rowId: { uuid: "2" }, value: "Jerry" },
          { colId: { uuid: "gender" }, rowId: { uuid: "2" }, value: "female" },
          { colId: { uuid: "name" }, rowId: { uuid: "3" }, value: "May" },
        ],
      },
      // the operation for applying to current document.
      {
        insertRows: [
          {
            id: { uuid: "0" },
            data: [
              { colId: { uuid: "name" }, value: "Capybara" },
              { colId: { uuid: "age" }, value: "12" },
              { colId: { uuid: "gender" }, value: "male" },
            ],
          },
        ],
        deleteRows: [{ uuid: "1" }],
      },
    ]);
  });
});
