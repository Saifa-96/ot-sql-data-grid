export enum AggregateFunction {
  Avg = "Avg",
  Count = "Count",
  Max = "Max",
  Min = "Min",
  Sum = "Sum",
}

export const toAggregateFunctionName = (
  str: string
): AggregateFunction | null => {
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
    default:
      return null;
  }
};
