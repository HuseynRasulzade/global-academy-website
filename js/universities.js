const countryFilters = document.querySelectorAll('.country-filter');
const universityCards = document.querySelectorAll('.university-card');

countryFilters.forEach((filterButton) => {
  filterButton.addEventListener('click', () => {
    const selectedCountry = filterButton.dataset.filter;

    countryFilters.forEach((button) => {
      const isActive = button === filterButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    universityCards.forEach((card) => {
      const isVisible = selectedCountry === 'all' || card.dataset.country === selectedCountry;
      card.hidden = !isVisible;
    });
  });
});
