document.addEventListener("DOMContentLoaded", function() {
	display_menu_items();
	toggle_sort_items_table();
});

const fs = require('fs');

// call mysql database module
const mysql = require(__dirname + "/js/modules/mysql.js");
// create database connection
const connection = mysql.connection;
// check database connection
mysql.check_connection();

// dialog module
const dialog = require(__dirname + "/js/modules/dialog.js");
const dialog_open = dialog.dialog_open;
const dialog_close = dialog.dialog_close;

//----- Show Foods Function -----//
// Start Query Here
function display_menu_items() {
	console.log("called display_menu_items()")

	connection.connect(function(err) {
		if (err) throw err;
		//Select all foods and return the result object:
		connection.query("SELECT * FROM manage_db.menu_items", function(err, result) {
			if (err) throw err;

			let placeholder = document.querySelector("#menu_items_list");
			let out = "";

			for (let row of result) {
				// to read the blob data type
				let image_src = row.item_image ? `data:image/jpeg;base64,${row.item_image.toString('base64')}` : '';
				out += `
					<tr class="bg-white border-b dark:border-gray-700 border-r border-l hover:bg-gray-300">
						<td data-column="item_id" class="text-center font-bold">${row.item_id}</td>
						<td data-column="item_name" class="text-center">${row.item_name}</td>
						<td data-column="item_description" class="text-center">${row.item_desc}</td>
						<td><img src="${image_src}" width="300"></td>
						<td data-column="item_price" class="text-center">${row.item_price}</td>
						<td data-column="item_quantity_sold" class="text-center">${row.quantity_sold}</td>
						<td data-column="item_revenue" class="text-center font-bold">₱${row.revenue_generated}</td>
						<td>
							<span class="action-btn">
							<button onclick="dialog_open('update_item_dialog'); row_click()" class="rounded-lg bg-sky-400 py-2 px-2 inline-flex hover:bg-sky-300 text-zinc-50 hover:drop-shadow-lg">
								<img src="assets/svg/pencil-alt.svg" class="hover:text-zinc-50">
							</button>
							<button onclick="dialog_open('remove_item_dialog'); row_click()" class="rounded-lg bg-rose-500 py-2 px-2 inline-flex hover:bg-rose-300 text-zinc-50 hover:drop-shadow-lg">
								<img src="assets/svg/trash.svg" class="hover:text-zinc-50">
							</button>
							</span>
						</td>
					</tr>
				`;
			}
			placeholder.innerHTML = out;
		});
	})
}

function refresh_menu_items() {
	console.log("called refresh_menu_items()");

	// close all active dialogs with active-dialog class
	// NOTE: will execute if dialog_open() is executed
	const activeDialogs = document.querySelectorAll(".active-dialog");
	activeDialogs.forEach((dialog) => {
		dialog.close();
		dialog.classList.remove("active-dialog");
	});

	// empty the registered_devices table body
	const table_body = document.getElementById("menu_items_list");
	table_body.innerHTML = "";

	// repopulate the registered_devices table body
	display_menu_items();
}

// add new menu item
function add_item() {
	console.log("called add_item()");

	const item_name = document.getElementById("add_item_name").value.trim();
	const item_desc = document.getElementById("add_item_desc").value.trim();
	const item_img = document.getElementById("add_item_img").files[0];
	const item_price = document.getElementById("add_item_price").value.trim();

	// validate required inputs
	if (!item_name || !item_price)
		return dialog_open("add_item_error_dialog");

	let form_data = new FormData();
	form_data.append("name", item_name);
	form_data.append("description", item_desc);
	form_data.append("image", item_img);
	form_data.append("price", item_price);

	fetch("http://localhost:8080/upload_item", {
		method: "POST",
		body: form_data
	})
		.then((response) => response.json())
		.then((data) => {
			console.log(data);
			if (data.success) {
				dialog_open("add_item_success_dialog");
				document.getElementById("item_name_placeholder").innerHTML = document.getElementById("add_item_name").value;

				// clear the inputs
				document.getElementById("add_item_name").value = "";
				document.getElementById("add_item_desc").value = "";
				document.getElementById("add_item_img").value = "";
				document.getElementById("add_item_price").value = "";
			}
			else
				dialog_open("add_item_error_dialog");
		})
		.catch((error) => {
			console.log("Error: ", error);
		})
}

// update an existing menu item
function update_item() {
	console.log("called update_item()");

	// values from row_click() function
	var item_id = document.getElementById("update_item_id").value;
	var item_name = document.getElementById("update_item_name").value;
	var item_desc = document.getElementById("update_item_desc").value;
	var item_new_img = document.getElementById("update_new_image");
	var item_price = document.getElementById("update_item_price").value;

	// check if a new image is selected
	var item_image = ""
	if (item_new_img.files.length > 0) {
		item_image = item_new_img.files[0];
	}

	const form_data = new FormData();
	form_data.append("id", item_id);
	form_data.append("name", item_name);
	form_data.append("description", item_desc);
	form_data.append("image", item_image);
	form_data.append("price", item_price);

	// establish connection to server.js
	fetch("http://localhost:8080/update_item", {
		method: "POST",
		body: form_data,
	})
		.then((response) => response.json())
		.then((data) => {
			console.log(data);
			if (data.success) {
				console.log(data.message);
				dialog_open("update_item_success_dialog");
				document.getElementById("updated_item_placeholder").innerHTML = document.getElementById("update_item_name").value;
				// clear image input buffer
				document.getElementById("update_new_image").value = "";
			} else {
				// Error occurred while updating
				console.error("Error:", data.error);
			}
		})
		.catch((error) => {
			console.error("Error:", error);
		});
}

// delete an item based on the item id
function delete_item() {
	console.log("called delete_item()");

	var id = document.getElementById("remove_item_id").value;

	const query = `DELETE FROM menu_items WHERE item_id = "${id}"`;
	connection.query(query, error => {
		if (error) {
			alert("Error!")
			console.log(error)
		}
		else {
			dialog_open("remove_item_success_dialog");
			document.getElementById("removed_item_placeholder").innerHTML = document.getElementById("remove_item_name").innerHTML;
		}
	});
}

function sort_menu_items(table, column, sortOrder) {
	console.log(`called sort_menu_items(${table}, ${column}, ${sortOrder})`);

	const tbody = table.querySelector("tbody");
	const rows = Array.from(tbody.querySelectorAll("tr"));

	rows.sort((a, b) => {
		const cell_a = a.querySelector(`td[data-column="${column}"]`);
		const cell_b = b.querySelector(`td[data-column="${column}"]`);
		if (cell_a && cell_b) {
			const comparison = cell_a.textContent.localeCompare(cell_b.textContent, undefined, { numeric: true });
			return sortOrder === "asc" ? comparison : -comparison;
		}
		return 0; // Default comparison when one or both cells are missing
	});

	rows.forEach((row) => {
		tbody.appendChild(row);
	});
}

function toggle_sort_items_table() {
	// sort by column
	const sortOrders = {};
	const headers = document.querySelectorAll("#menu_items_table th[data-column]");

	headers.forEach((header) => {
		const column = header.getAttribute("data-column");
		sortOrders[column] = "asc"; // Set the initial sort order to ascending

		header.addEventListener("click", () => {
			// Toggle sort order on each click
			sortOrders[column] = sortOrders[column] === "asc" ? "desc" : "asc";
			sort_menu_items(document.getElementById("menu_items_table"), column, sortOrders[column]);
		});
	});
}

// table row click, used for updating and deleting an item
function row_click() {
	console.log("called row_click()");

	var table = document.getElementById("menu_items_table");
	var rows = table.getElementsByTagName("tr");
	for (let i = 0; i < rows.length; i++) {
		var currentRow = table.rows[i];
		var clickHandle = function(row) {
			return function() {
				var item_id = row.getElementsByTagName("td")[0];
				var item_name = row.getElementsByTagName("td")[1];
				var item_desc = row.getElementsByTagName("td")[2];
				var item_img = row.getElementsByTagName("td")[3];
				var item_price = row.getElementsByTagName("td")[4];
				var item_quantity_sold = row.getElementsByTagName("td")[5];
				var item_revenue = row.getElementsByTagName("td")[6];

				var id = item_id.innerHTML;
				var name = item_name.innerHTML;
				var desc = item_desc.innerHTML;
				var img = item_img.innerHTML;
				var price = item_price.innerHTML;
				var quantity_sold = item_quantity_sold.innerHTML;
				var revenue = item_revenue.innerHTML;

				var imgElement = row.querySelector('img');
				var imgSrc = imgElement.getAttribute('src');

				// for item update
				document.getElementById("update_item_id").value = id;
				document.getElementById("update_item_name").value = name;
				document.getElementById("update_item_desc").value = desc;
				document.getElementById("update_image_preview").src = imgSrc;
				document.getElementById("update_item_price").value = price;

				// used for item delete or remove
				document.getElementById("remove_item_id").value = id;
				document.getElementById("remove_item_name").innerHTML = name;
				document.getElementById("remove_item_desc").innerHTML = desc;
				document.getElementById("remove_item_image").src = imgSrc;
				document.getElementById("remove_item_price").innerHTML = price;
				document.getElementById("remove_item_quantity_sold").innerHTML = quantity_sold;
				document.getElementById("remove_item_revenue").innerHTML = revenue;
			};
		};
		currentRow.onclick = clickHandle(currentRow);
	}
}

// search an item via id
function search_via_id() {
	console.log("called search_via_id()");

	if (document.getElementById("search_item_box").value == "") {
		dialog_open('search_item_error_dialog');
	}
	else {
		var food_id = document.getElementById("search_item_box").value;
		console.log(food_id);

		connection.query(`SELECT * FROM manage_db.menu_items WHERE item_id = "${food_id}"`, function(err, result) {
			if (err) throw err;

			let placeholder = document.querySelector("#menu_items_list");
			let out = "";

			for (let row of result) {
				let image_src = `data:image/jpeg;base64,${row.item_image.toString('base64')}`;
				out += `
				<tr class="bg-white border-b dark:border-gray-700 border-r border-l hover:bg-gray-300">
					<td class="text-center font-bold">${row.item_id}</td>
					<td class="text-center">${row.item_name}</td>
					<td class="text-center">${row.item_desc}</td>
					<td><img src="${image_src}" alt="Foods Image" width="300"></td>
					<td class="text-center">${row.item_price}</td>
					<td class="text-center">${row.quantity_sold}</td>
					<td class="text-center">${row.revenue_generated}</td>
					<td>
						<span class="action-btn">
						<button onclick="dialog_open('update_item_dialog'); row_click()" class="rounded-lg bg-sky-400 py-2 px-2 inline-flex hover:bg-sky-300 text-zinc-50 hover:drop-shadow-lg">
							<img src="assets/svg/pencil-alt.svg" class="hover:text-zinc-50">
						</button>
						<button onclick="dialog_open('remove_item_dialog'); row_click()" class="rounded-lg bg-rose-500 py-2 px-2 inline-flex hover:bg-rose-300 text-zinc-50 hover:drop-shadow-lg">
							<img src="assets/svg/trash.svg" class="hover:text-zinc-50">
						</button>
						</span>
					</td>
				</tr>
			`;
			}
			placeholder.innerHTML = out;
		});
		dialog_close('search_item_dialog');
	}
}

