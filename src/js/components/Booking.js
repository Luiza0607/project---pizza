import { templates, select, settings, classNames } from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.selectedTableId;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getDate();
    thisBooking.initActions();

  }

  getDate() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePickerElem.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePickerElem.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    //console.log('getData params', params);

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking
        + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event
        + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event
        + '?' + params.eventsRepeat.join('&'),
    };

    //console.log('getData urls', url);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function (allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        //console.log('bookings', bookings);
        //console.log('eventsCurrent', eventsCurrent);
        //console.log('eventsRepeat', eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }


  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePickerElem.minDate;
    const maxDate = thisBooking.datePickerElem.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {

      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePickerElem.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPickerElem.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
      table.classList.remove(classNames.booking.selected);
    }
    thisBooking.selectTableId = null;
  }


  initTables(clickedTable) {
    const thisBooking = this;

    if (clickedTable.classList.contains(classNames.booking.tableBooked)) {
      alert('This table is booked');
      return;
    }

    if (!clickedTable.classList.contains(classNames.booking.tableSelected)) {

      const activeTable = thisBooking.dom.floor.querySelector(select.booking.tableSelected);
      if (activeTable) activeTable.classList.remove(classNames.booking.tableSelected);

      clickedTable.classList.add(classNames.booking.tableSelected);
      thisBooking.selectedTable = clickedTable.getAttribute('data-table');
    } else {
      clickedTable.classList.remove(classNames.booking.tableSelected);
      thisBooking.selectedTable = '';
    }
  }

  render(element) {
    const thisBooking = this;
    const generatedHtml = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHtml;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.widgets.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.widgets.booking.hoursAmount);
    thisBooking.dom.datePickerInput = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPickerInput = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.widgets.booking.tables);
    thisBooking.dom.floor = thisBooking.dom.wrapper.querySelector(select.containerOf.floor);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.submit = thisBooking.dom.wrapper.querySelector(select.booking.submit);
    thisBooking.dom.checkboxes = thisBooking.dom.wrapper.querySelectorAll(select.booking.checkbox);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.datePickerElem = new DatePicker(thisBooking.dom.datePickerInput);
    thisBooking.hourPickerElem = new HourPicker(thisBooking.dom.hourPickerInput);

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.dom.peopleAmount.addEventListener('updated', function () { });

    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.dom.hoursAmount.addEventListener('updated', function () { });

    thisBooking.dom.datePickerInput.addEventListener('updated', function () {
      thisBooking.selectedTable = '';
      const activeTable = thisBooking.dom.floor.querySelector(select.booking.tableSelected);
      if (activeTable) activeTable.classList.remove(classNames.booking.tableSelected);
    });

    thisBooking.dom.hourPickerInput.addEventListener('updated', function () {
      thisBooking.selectedTable = '';
      const activeTable = thisBooking.dom.floor.querySelector(select.booking.tableSelected);
      if (activeTable) activeTable.classList.remove(classNames.booking.tableSelected);
    });

    console.log(thisBooking.dom);
    thisBooking.dom.floor.addEventListener('click', function (event) {
      if (event.target.classList.contains('table')) {
        thisBooking.initTables(event.target);
      }
    });

  }

  sendBooking() {
    const thisBooking = this;
    const url = settings.db.url + '/' + settings.db.booking;
    const payload = {
      date: thisBooking.datePickerElem.value,
      hour: thisBooking.hourPickerElem.value,
      table: thisBooking.tableId,
      duration: thisBooking.hoursAmount,
      ppl: thisBooking.peopleAmount,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    console.log('payload:', payload);

    if (thisBooking.dom.checkboxes[1].checked) {
      payload.starters.push(
        thisBooking.dom.checkboxes[0].value,
        thisBooking.dom.checkboxes[1].value
      );
    } else if (thisBooking.dom.checkboxes[0].checked) {
      payload.starters.push(thisBooking.dom.checkboxes[0].value);
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        thisBooking.makeBooked(
          parsedResponse.date,
          parsedResponse.hour,
          parsedResponse.duration,
          parsedResponse.table
        );
        thisBooking.updateDOM();
      });
  }

  initActions() {
    const thisBooking = this;
    thisBooking.dom.submit.addEventListener('click', function (e) {
      e.preventDefault();
      thisBooking.sendBooking();
    });
  }
}

export default Booking; 