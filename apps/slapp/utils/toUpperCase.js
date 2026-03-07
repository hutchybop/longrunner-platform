export const toUpperCase = (string) => {
  string = string.trim();
  string = string.split(" ");
  let stringUpper = "";
  for (let i of string) {
    if (i !== "") {
      stringUpper += i[0].toUpperCase() + i.slice(1, i.length) + " ";
    }
  }
  stringUpper = stringUpper.trim();
  return stringUpper;
};
