import { describe, expect, test } from "@jest/globals";
import { clone } from "lodash";
import { compose, transform } from "./operation";

describe("utils module", () => {
  test("compose function", () => {
    expect(
      compose(
        {
          deleteRows: [{ symbol: "1" }],
          deleteCols: [{ id: "col2" }],
        },
        {
          updateCells: [
            { colId: { id: "col1" }, rowId: { symbol: "1" }, value: "123" },
            { colId: { id: "col2" }, rowId: { symbol: "3" }, value: "123" },
          ],
        }
      )
    ).toEqual({
      deleteRows: [{ symbol: "1" }],
      deleteCols: [{ id: "col2" }],
    });

    expect(
      compose(
        {
          updateCells: [
            { colId: { id: "col1" }, rowId: { symbol: "1" }, value: "123" },
            { colId: { id: "col1" }, rowId: { symbol: "2" }, value: "2" },
            { colId: { id: "col2" }, rowId: { symbol: "3" }, value: "123" },
          ],
        },
        {
          updateCells: [
            { colId: { id: "col1" }, rowId: { symbol: "1" }, value: "1" },
            { colId: { id: "col2" }, rowId: { symbol: "3" }, value: "3" },
          ],
        }
      )
    ).toEqual({
      updateCells: [
        { colId: { id: "col1" }, rowId: { symbol: "1" }, value: "1" },
        { colId: { id: "col2" }, rowId: { symbol: "3" }, value: "3" },
        { colId: { id: "col1" }, rowId: { symbol: "2" }, value: "2" },
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
          deleteCols: [{ id: "age" }],
          updateCells: [
            { colId: { id: "name" }, rowId: { id: "1" }, value: "Tom" },
            { colId: { id: "name" }, rowId: { id: "2" }, value: "Jerry" },
            { colId: { id: "gender" }, rowId: { id: "2" }, value: "female" },
            { colId: { id: "name" }, rowId: { id: "3" }, value: "May" },
          ],
        },
        // the operation which received from another client side.
        {
          insertRows: [
            {
              id: { id: "0" },
              data: [
                { colId: { id: "name" }, value: "Capybara" },
                { colId: { id: "age" }, value: "12" },
                { colId: { id: "gender" }, value: "male" },
              ],
            },
          ],
          updateCells: [
            { colId: { id: "name" }, rowId: { id: "2" }, value: "Smith" },
            { colId: { id: "age" }, rowId: { id: "2" }, value: "30" },
          ],
          deleteRows: [{ id: "1" }],
        }
      )
    ).toEqual([
      // the operation will sent to the server side.
      {
        deleteCols: [{ id: "age" }],
        updateCells: [
          { colId: { id: "name" }, rowId: { id: "2" }, value: "Jerry" },
          { colId: { id: "gender" }, rowId: { id: "2" }, value: "female" },
          { colId: { id: "name" }, rowId: { id: "3" }, value: "May" },
        ],
      },
      // the operation for applying to current document.
      {
        insertRows: [
          {
            id: { id: "0" },
            data: [
              { colId: { id: "name" }, value: "Capybara" },
              { colId: { id: "age" }, value: "12" },
              { colId: { id: "gender" }, value: "male" },
            ],
          },
        ],
        deleteRows: [{ id: "1" }],
      },
    ]);
  });
});
