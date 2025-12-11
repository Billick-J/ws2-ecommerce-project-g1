// public/js/cart.js
document.addEventListener("DOMContentLoaded", () => {
  const cartForm = document.getElementById("cartForm");
  if (!cartForm) return;

  const selectAllCheckbox = document.getElementById("selectAll");
  const itemCheckboxes = Array.from(document.querySelectorAll(".item-checkbox"));
  const totalAmountEl = document.getElementById("totalAmount");

  // Helper: recalc total based on selected items
  const recalcTotal = () => {
    let total = 0;
    document.querySelectorAll(".cart-row").forEach(row => {
      const price = parseFloat(row.dataset.price);
      const qty = parseInt(row.querySelector(".quantity").textContent, 10);
      const checkbox = row.querySelector(".item-checkbox");
      if (checkbox.checked) {
        total += price * qty;
      }
      row.querySelector(".cart-subtotal").textContent = `₱${(price * qty).toFixed(2)}`;
    });
    totalAmountEl.textContent = total.toFixed(2);
  };

  // Quantity and delete buttons
  document.querySelectorAll(".cart-row").forEach(row => {
    const deleteBtn = row.querySelector(".delete-btn");
    const increaseBtn = row.querySelector(".increase-btn");
    const decreaseBtn = row.querySelector(".decrease-btn");
    const quantityEl = row.querySelector(".quantity");
    const productId = row.querySelector(".item-checkbox").value;

    // Delete item
    deleteBtn.addEventListener("click", async () => {
      const res = await fetch("/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        row.remove();
        recalcTotal();
      }
    });

    // Increase quantity
    increaseBtn.addEventListener("click", async () => {
      let qty = parseInt(quantityEl.textContent, 10) + 1;
      const res = await fetch("/cart/update-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty })
      });
      if (res.ok) {
        quantityEl.textContent = qty;
        recalcTotal();
      }
    });

    // Decrease quantity
    decreaseBtn.addEventListener("click", async () => {
      let qty = parseInt(quantityEl.textContent, 10);
      if (qty <= 1) return;
      qty--;
      const res = await fetch("/cart/update-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: qty })
      });
      if (res.ok) {
        quantityEl.textContent = qty;
        recalcTotal();
      }
    });
  });

  // Select all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      const checked = selectAllCheckbox.checked;
      itemCheckboxes.forEach(cb => cb.checked = checked);
      recalcTotal();
    });
  }

  // Individual checkboxes
  itemCheckboxes.forEach(cb => cb.addEventListener("change", recalcTotal));

  // Before submitting checkout
  cartForm.addEventListener("submit", (e) => {
    const allRows = Array.from(document.querySelectorAll(".cart-row"));
    const selectedItems = allRows.filter(row => row.querySelector(".item-checkbox").checked)
      .map(row => ({
        productId: row.querySelector(".item-checkbox").value,
        quantity: parseInt(row.querySelector(".quantity").textContent, 10)
      }));

    if (selectedItems.length === 0) {
      e.preventDefault();
      alert("Please select at least one item to checkout.");
      return;
    }

    // Replace hidden input with updated selected items
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "items";
    hiddenInput.value = JSON.stringify(selectedItems);
    cartForm.appendChild(hiddenInput);
  });
});
