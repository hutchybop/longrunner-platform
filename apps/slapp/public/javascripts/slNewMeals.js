// Returns the date of the next friday in the format 'Shopping List dd(suffix) month'
// 5 at ret.setDate relates to the day in the week ie friday
const nth = function (d) {
  if (d > 3 && d < 21) return "th";
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};
const nextFridayDate = () => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let ret = new Date();
  ret.setDate(ret.getDate() + ((6 - 1 - ret.getDay() + 7) % 7) + 1);
  let dd = ret.getDate();
  let mm = monthNames[ret.getMonth()];
  ret = `Shopping List - ${dd}${nth(dd)} ${mm}`;
  return ret;
};

const slName = document.querySelector("#name");
slName.value = nextFridayDate();
