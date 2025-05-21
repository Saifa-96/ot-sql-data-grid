export enum BuiltInFunction {
  // Scalar functions
  Cast = "Cast",
  Length = "Length",
  Lower = "Lower",
  Upper = "Upper",
  Trim = "Trim",
  LTrim = "LTrim",
  RTrim = "RTrim",
  Substr = "Substr",
  Replace = "Replace",
  Date = "Date",
  Time = "Time",
  Datetime = "Datetime",
  JulianDay = "JulianDay",
  UnixEpoch = "UnixEpoch",
  Strftime = "Strftime",
  TimeDiff = "TimeDiff",
  Abs = "Abs",
  Ceil = "Ceil",
  Floor = "Floor",
  Round = "Round",

  // Aggregate functions
  Count = "Count",
  Sum = "Sum",
  Avg = "Avg",
  Total = "Total",
  GroupConcat = "GroupConcat",

  // Both
  Min = "Min",
  Max = "Max",
}

export const toBuiltInFunction = (str: string): BuiltInFunction | null => {
  switch (str.toUpperCase()) {
    case "AVG":
      return BuiltInFunction.Avg;
    case "COUNT":
      return BuiltInFunction.Count;
    case "MAX":
      return BuiltInFunction.Max;
    case "MIN":
      return BuiltInFunction.Min;
    case "SUM":
      return BuiltInFunction.Sum;
    case "GROUP_CONCAT":
      return BuiltInFunction.GroupConcat;
    case "TOTAL":
      return BuiltInFunction.Total;
    case "CAST":
      return BuiltInFunction.Cast;
    case "LENGTH":
      return BuiltInFunction.Length;
    case "LOWER":
      return BuiltInFunction.Lower;
    case "UPPER":
      return BuiltInFunction.Upper;
    case "TRIM":
      return BuiltInFunction.Trim;
    case "LTRIM":
      return BuiltInFunction.LTrim;
    case "RTRIM":
      return BuiltInFunction.RTrim;
    case "DATE":
      return BuiltInFunction.Date;
    case "TIME":
      return BuiltInFunction.Time;
    case "DATETIME":
      return BuiltInFunction.Datetime;
    case "JULIANDAY":
      return BuiltInFunction.JulianDay;
    case "UNIXEPOCH":
      return BuiltInFunction.UnixEpoch;
    case "STRFTIME":
      return BuiltInFunction.Strftime;
    case "TIMEDIFF":
      return BuiltInFunction.TimeDiff;
    case "SUBSTR":
    case "SUBSTRING":
      return BuiltInFunction.Substr;
    case "REPLACE":
      return BuiltInFunction.Replace;
    case "ABS":
      return BuiltInFunction.Abs;
    case "CEIL":
    case "CEILING":
      return BuiltInFunction.Ceil;
    case "FLOOR":
      return BuiltInFunction.Floor;
    case "ROUND":
      return BuiltInFunction.Round;
    default:
      return null;
  }
};
