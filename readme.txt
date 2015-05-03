現在使用的template是template1.html
實際應用上是拆成 main\myapp\views中的 layout_header.ejs 和 layout_footer.ejs使用
如要修改請直接修改在那兩個ejs中


資料庫部分建在mongoLab上，完整位址是：
mongodb://lendingZone:lendingZone@ds031972.mongolab.com:31972/lending

User Name:lendingZone
Password:lendingZone
Address:ds031972.mongolab.com
Port:31972

已經建好基本的資料結構和create功能(update、delete、find尚無)
main\myapp\public中有用來測試用的...Create.html
可以用 http://localhost:3000/...Create.html的方式使用