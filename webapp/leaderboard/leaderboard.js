const API_URL = "http://localhost:5000/api/rankings"; // 后端 API 地址
let selfUsername = "ABCD"; // 你的用户名

// 模拟数据
const mockUsers = [
    { name: "Emma", score: 50, avatar: "../pictures/bird.jpg" },
    { name: "关关", score: 47, avatar: "../pictures/bird.jpg" },
    { name: "Yh", score: 40, avatar: "../pictures/bird.jpg" },
    { name: "兰叶春葳蕤", score: 32, avatar: "../pictures/bird.jpg" },
    { name: "黄宇强", score: 24, avatar: "../pictures/bird.jpg" },
    { name: "阿雷雷", score: 15, avatar: "../pictures/bird.jpg" },
    { name: "一西", score: 13, avatar: "../pictures/bird.jpg" },
    { name: "洪蛋蛋", score: 13, avatar: "../pictures/bird.jpg" },
    { name: "那个人", score: 13, avatar: "../pictures/bird.jpg" },
    { name: "s", score: 9, avatar: "../pictures/bird.jpg" },
    { name: "g雷", score: 5, avatar: "../pictures/bird.jpg" },
    { name: "w", score: 3, avatar: "../pictures/bird.jpg" },
    { name: "dgs", score: 2, avatar: "../pictures/bird.jpg" },
    { name: "www人", score: 1, avatar: "../pictures/bird.jpg" },
    { name: selfUsername, score: 3, avatar: "../pictures/bird.jpg" }
];

// 获取排行榜数据
async function fetchLeaderboard() {
    try {
        let response = await fetch(API_URL);
        let users = await response.json();
        renderLeaderboard(users);
    } catch (error) {
        console.error("获取排行榜数据失败，使用模拟数据", error);
        renderLeaderboard(mockUsers);
    }
}

// 更新前三名的静态 HTML 内容
function updateTopThree(users) {
    // 假设 users 已经按分数从高到低排序
    const topThree = users.slice(0, 3);
    // 获取 HTML 中预定义的前三名元素（需在 HTML 中定义 id="rank1", "rank2", "rank3"）
    const rank1 = document.getElementById("rank1"); // 第一名（中间）
    const rank2 = document.getElementById("rank2"); // 第二名（左侧）
    const rank3 = document.getElementById("rank3"); // 第三名（右侧）

    if (!rank1 || !rank2 || !rank3) {
        console.error("未找到前三名的静态 HTML 元素！");
        return;
    }

    // 第一名更新
    rank1.querySelector(".rank-number").textContent = "TOP1";
    rank1.querySelector(".name").textContent = topThree[0].name;
    rank1.querySelector(".score").textContent = "SCORE: " + topThree[0].score;
    rank1.querySelector("img").src = topThree[0].avatar;

    // 第二名更新
    rank2.querySelector(".rank-number").textContent = "TOP2";
    rank2.querySelector(".name").textContent = topThree[1].name;
    rank2.querySelector(".score").textContent = "SCORE: " + topThree[1].score;
    rank2.querySelector("img").src = topThree[1].avatar;

    // 第三名更新
    rank3.querySelector(".rank-number").textContent = "TOP3";
    rank3.querySelector(".name").textContent = topThree[2].name;
    rank3.querySelector(".score").textContent = "SCORE: " + topThree[2].score;
    rank3.querySelector("img").src = topThree[2].avatar;
}

// 渲染排行榜（剩余部分）
function renderLeaderboard(users) {
    let rankingList = document.getElementById("rankingList");
    let selfRankDiv = document.getElementById("selfRank");

    // 清空列表内容（前三名部分已通过 updateTopThree 更新）
    rankingList.innerHTML = "";
    selfRankDiv.innerHTML = "";

    // 排序（确保最高分在前）
    users.sort((a, b) => b.score - a.score);

    // 更新前三名静态 HTML 内容
    updateTopThree(users);

    // 用 Map 记录分数对应的排名，剩余用户从第4名开始
    let rankingMap = new Map();
    let currentRank = 4; // 从第 4 名开始
    let lastScore = null; // 记录上一个分数
    let selfRank = null;

    // 处理剩余用户
    users.slice(3).forEach((user) => {
        // 如果分数不同，则更新对应排名
        if (user.score !== lastScore) {
            rankingMap.set(user.score, currentRank);
            lastScore = user.score;
        }
        let rank = rankingMap.get(user.score);
        currentRank++;

        let li = document.createElement("li");
        li.innerHTML = `
            <span class="rank-number">${rank}</span>
            <img src="${user.avatar}" alt="${user.name}" class="avatar">
            <span class="name">${user.name}</span>
            <span class="score">SCORE: ${user.score}</span>
        `;
        rankingList.appendChild(li);

        // 记录“我的排名”
        if (user.name === selfUsername) {
            selfRank = { rank, ...user };
        }
    });

    // 更新固定显示的“我的排名”
    if (selfRank) {
        selfRankDiv.innerHTML = `
            <div>
                <span class="rank-number">${selfRank.rank}</span>
                <img src="${selfRank.avatar}" alt="${selfRank.name}" class="avatar">
                <span class="name">${selfRank.name}</span>
                <span class="score">SCORE: ${selfRank.score}</span>
            </div>
        `;
    } else {
        selfRankDiv.innerHTML = `<p>未找到我的排名</p>`;
    }
}

// 运行获取排行榜数据
fetchLeaderboard();
