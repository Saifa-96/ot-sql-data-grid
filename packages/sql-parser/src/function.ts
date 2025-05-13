export enum AggregateFunction {
  Count = "Count",
  Sum = "Sum",
  Avg = "Avg",
  Min = "Min",
  Max = "Max",
  Total = "Total",
  GroupConcat = "GroupConcat",
}

export enum ScalarFunction {
  Cast = "Cast",
  Length = "Length",
  Lower = "Lower",
  Upper = "Upper",
  // Trim = "Trim",
  // LTrim = "LTrim",
  // RTrim = "RTrim",
}

export const toAggregateFuncType = (str: string): AggregateFunction | null => {
  switch (str.toUpperCase()) {
    case "AVG":
      return AggregateFunction.Avg;
    case "COUNT":
      return AggregateFunction.Count;
    case "MAX":
      return AggregateFunction.Max;
    case "MIN":
      return AggregateFunction.Min;
    case "SUM":
      return AggregateFunction.Sum;
    case "GROUP_CONCAT":
      return AggregateFunction.GroupConcat;
    case "TOTAL":
      return AggregateFunction.Total;
    default:
      return null;
  }
};

export const toScalarFuncType = (str: string): ScalarFunction | null => {
  switch (str.toUpperCase()) {
    case "CAST":
      return ScalarFunction.Cast;
    case "LENGTH":
      return ScalarFunction.Length;
    case "LOWER":
      return ScalarFunction.Lower;
    case "UPPER":
      return ScalarFunction.Upper;
    // case "TRIM":
    //   return ScalarFunction.Trim;
    // case "LTRIM":
    //   return ScalarFunction.LTrim;
    // case "RTRIM":
    //   return ScalarFunction.RTrim;
    default:
      return null;
  }
};
