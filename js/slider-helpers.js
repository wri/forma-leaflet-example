
// Create a string representation of the date based on the slider val
function slider_to_date(slider_val) {
	
	// if year < 1, slider val = 12000, if year < 2, slider val = 13000, etc
	var year = (parseInt(slider_val) + 1) * 1000 + 11000
    var day = parseInt(365 * (slider_val % 1))

    // deal with issue of 12/31/11 --> 1/1/2012
    if (year == 12000 && day == 0) {
        day += 1
    }

    return (year + day).toString()

}

// convert the date from YYDDD (year + julian day)
// to standard MM-DD-YY format for display
function formatDate(date_str) {

    if (date_str == '0') {
        var date_text = 'Undefined'
    } else {
        var julian_day = parseInt(date_str.slice(-3).toString())
        var year_char_len = date_str.length - 3

        var year = 2000 + parseInt(date_str.slice(0, year_char_len))
        var date = new Date(new Date(year, 0).setDate(julian_day));

        var date_text = date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
    }
    return date_text
}

// format numbers > 1000 properly
function withCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}