// 급식 정보 웹앱 JavaScript

class MealInfoApp {
    constructor() {
        this.apiUrl = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
        this.params = {
            Type: 'json',
            pIndex: 1,
            pSize: 100,
            ATPT_OFCDC_SC_CODE: 'S10',
            SD_SCHUL_CODE: '9022174'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.loadTodayMeal();
    }

    setupEventListeners() {
        // 검색 버튼 이벤트
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchMealInfo();
        });

        // 엔터키 이벤트
        document.getElementById('mealDate').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchMealInfo();
            }
        });

        // 빠른 날짜 선택 버튼들
        document.querySelectorAll('.quick-date').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.dataset.days);
                this.setDateByOffset(days);
                this.searchMealInfo();
            });
        });
    }

    setDefaultDate() {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('mealDate').value = dateString;
    }

    setDateByOffset(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const dateString = date.toISOString().split('T')[0];
        document.getElementById('mealDate').value = dateString;
    }

    async loadTodayMeal() {
        // 페이지 로드 시 오늘 급식 정보 자동 로드
        setTimeout(() => {
            this.searchMealInfo();
        }, 500);
    }

    async searchMealInfo() {
        const selectedDate = document.getElementById('mealDate').value;
        
        if (!selectedDate) {
            this.showError('날짜를 선택해주세요.');
            return;
        }

        this.showLoading(true);
        
        try {
            const mealData = await this.fetchMealData(selectedDate);
            this.displayMealInfo(mealData, selectedDate);
        } catch (error) {
            console.error('급식 정보 조회 실패:', error);
            this.showError('급식 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchMealData(date) {
        const formattedDate = date.replace(/-/g, '');
        const url = `${this.apiUrl}?${new URLSearchParams({
            ...this.params,
            MLSV_YMD: formattedDate
        })}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // API 응답 구조 확인
        if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
            throw new Error(data.RESULT.MESSAGE || 'API 오류가 발생했습니다.');
        }

        return data;
    }

    displayMealInfo(data, date) {
        const mealInfo = this.extractMealInfo(data);
        
        if (!mealInfo) {
            this.showNoData();
            return;
        }

        this.updateDateDisplay(date);
        this.updateMenuItems(mealInfo.DDISH_NM);
        this.updateAllergenInfo(mealInfo.DDISH_NM);
        this.updateNutritionInfo(mealInfo.NTR_INFO);
        this.updateOriginInfo(mealInfo.ORPLC_INFO);
        
        this.showMealInfo();
        
        // 성공 알림
        Swal.fire({
            icon: 'success',
            title: '급식 정보를 불러왔습니다!',
            text: `${this.formatDate(date)} 중식 정보입니다.`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }

    extractMealInfo(data) {
        if (!data.mealServiceDietInfo || !data.mealServiceDietInfo[1] || !data.mealServiceDietInfo[1].row) {
            return null;
        }

        const meals = data.mealServiceDietInfo[1].row;
        
        // 중식 정보 찾기 (MMEAL_SC_CODE: 2는 중식)
        const lunchMeal = meals.find(meal => meal.MMEAL_SC_CODE === '2');
        
        return lunchMeal || null;
    }

    updateDateDisplay(date) {
        const formattedDate = this.formatDate(date);
        document.getElementById('mealDateDisplay').textContent = formattedDate;
    }

    updateMenuItems(dishInfo) {
        const menuContainer = document.getElementById('menuItems');
        const dishes = dishInfo.split('\n').filter(dish => dish.trim());
        
        menuContainer.innerHTML = dishes.map(dish => {
            const cleanDish = dish.replace(/\d+\./g, '').trim();
            return `<div class="menu-item fade-in-up">
                        <i class="fas fa-utensils text-orange-500 mr-2"></i>
                        ${cleanDish}
                    </div>`;
        }).join('');
    }

    updateAllergenInfo(dishInfo) {
        const allergenContainer = document.getElementById('allergenInfo');
        const allergens = this.extractAllergens(dishInfo);
        
        if (allergens.length === 0) {
            allergenContainer.innerHTML = '<p class="text-green-600"><i class="fas fa-check-circle mr-2"></i>알레르기 성분이 없습니다.</p>';
            return;
        }

        allergenContainer.innerHTML = allergens.map(allergen => {
            const allergenNames = this.getAllergenNames(allergen);
            return `<div class="mb-2">
                        <span class="allergen-badge">${allergen}</span>
                        <span class="text-sm text-gray-600 ml-2">${allergenNames}</span>
                    </div>`;
        }).join('');
    }

    extractAllergens(dishInfo) {
        const allergenPattern = /\d+\./g;
        const matches = dishInfo.match(allergenPattern);
        
        if (!matches) return [];
        
        // 중복 제거 및 정렬
        const allergens = [...new Set(matches.map(match => match.replace('.', '')))].sort((a, b) => parseInt(a) - parseInt(b));
        return allergens;
    }

    getAllergenNames(allergenNumber) {
        const allergenMap = {
            '1': '난류',
            '2': '우유',
            '3': '메밀',
            '4': '땅콩',
            '5': '대두',
            '6': '밀',
            '7': '고등어',
            '8': '게',
            '9': '새우',
            '10': '돼지고기',
            '11': '복숭아',
            '12': '토마토',
            '13': '아황산류',
            '14': '호두',
            '15': '닭고기',
            '16': '쇠고기',
            '17': '오징어',
            '18': '조개류(굴, 전복, 홍합 포함)',
            '19': '잣',
            '20': '연어',
            '21': '아보카도',
            '22': '키위',
            '23': '바나나',
            '24': '오렌지',
            '25': '사과',
            '26': '복숭아',
            '27': '토마토',
            '28': '메밀',
            '29': '아황산류',
            '30': '아황산류'
        };
        
        return allergenMap[allergenNumber] || '알 수 없음';
    }

    updateNutritionInfo(nutritionInfo) {
        const nutritionContainer = document.getElementById('nutritionInfo');
        const nutritionData = this.parseNutritionInfo(nutritionInfo);
        
        nutritionContainer.innerHTML = nutritionData.map(item => {
            return `<div class="nutrition-item">
                        <span class="nutrition-label">${item.label}</span>
                        <span class="nutrition-value">${item.value}</span>
                    </div>`;
        }).join('');
    }

    parseNutritionInfo(nutritionInfo) {
        const lines = nutritionInfo.split('\n').filter(line => line.trim());
        const nutritionData = [];
        
        lines.forEach(line => {
            const match = line.match(/([^:]+):\s*(.+)/);
            if (match) {
                nutritionData.push({
                    label: match[1].trim(),
                    value: match[2].trim()
                });
            }
        });
        
        return nutritionData;
    }

    updateOriginInfo(originInfo) {
        const originContainer = document.getElementById('originInfo');
        const originData = this.parseOriginInfo(originInfo);
        
        originContainer.innerHTML = originData.map(item => {
            return `<div class="origin-item">
                        <strong>${item.item}:</strong> ${item.origin}
                    </div>`;
        }).join('');
    }

    parseOriginInfo(originInfo) {
        const lines = originInfo.split('\n').filter(line => line.trim());
        const originData = [];
        
        lines.forEach(line => {
            const match = line.match(/([^:]+):\s*(.+)/);
            if (match) {
                originData.push({
                    item: match[1].trim(),
                    origin: match[2].trim()
                });
            }
        });
        
        return originData;
    }

    showMealInfo() {
        document.getElementById('mealInfo').classList.remove('d-none');
        document.getElementById('mealInfo').classList.add('fade-in-up');
        document.getElementById('noDataMessage').classList.add('d-none');
    }

    showNoData() {
        document.getElementById('mealInfo').classList.add('d-none');
        document.getElementById('noDataMessage').classList.remove('d-none');
        document.getElementById('noDataMessage').classList.add('fade-in-up');
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('d-none');
            document.getElementById('mealInfo').classList.add('d-none');
            document.getElementById('noDataMessage').classList.add('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: '오류 발생',
            text: message,
            confirmButtonText: '확인',
            confirmButtonColor: '#667eea'
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
    }
}

// 페이지 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MealInfoApp();
});

// PWA 지원을 위한 서비스 워커 등록 (선택사항)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
