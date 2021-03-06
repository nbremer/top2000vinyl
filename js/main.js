function create_top2000_visual() {

    var container = d3.select("#chart")

    var pi2 = 2*Math.PI,
        pi = Math.PI,
        pi1_2 = Math.PI/2;

    ////////////////////////////////////////////////////////////// 
    ///////////////////////// Set up sizes ///////////////////////
    ////////////////////////////////////////////////////////////// 

    var base_width = 1400

    var ww = window.innerWidth,
        wh = window.innerHeight

    var width;
    if(wh < ww) {
        width = wh/0.8; //= ww;
    } else {
        if(ww < 500) width = ww/0.5;
        else if(ww < 600) width = ww/0.6;
        else if(ww < 800) width = ww/0.7;
        else if(ww < 1100) width = ww/0.8;
        else width = ww/0.8;
    }//else
    width = Math.round(Math.min(base_width, width))
    //Add padding to the height for the legend
    var height = width

    //How much smaller is this visual than the original
    var size_factor = _.round(width/base_width,3)

    ////////////////////////////////////////////////////////////// 
    //////////////////////// Create SVG //////////////////////////
    ////////////////////////////////////////////////////////////// 

    container
        //.style("width", Math.max(ww - 60, width) + "px")
        .style("height", height + "px")
        .style("margin-top", (120 * size_factor) + "px");

    //Canvas
    var canvas = container.append("canvas")
        .attr("id", "canvas-vinyl")
        .attr('width', 2 * width)
        .attr('height', 2 * height)
        .style('width', width + "px")
        .style('height', height + "px")
    var ctx = canvas.node().getContext("2d")
    ctx.scale(2,2);
    ctx.translate(width/2,height/2);

    //SVG container
    var svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)

    var chart = svg.append("g")
        .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")")

    //If the chart is wider than the screen, make sure the left side is flush with the window
    if(width < ww) {
        d3.selectAll("svg, canvas").style("left", "50%")
        d3.selectAll("canvas").style("transform", "translateX(-50%)")

        if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
            //Can't do translateX on svg as well, due to Firefox bug with d3.mouse and transforms done on styling
            //https://github.com/d3/d3/issues/2771
            svg.attr("transform", "translate(" + -(width/2) + ",0)")
        } else {
            d3.selectAll("svg").style("transform", "translateX(-50%)")
        }//else
    }//if

    //////////////////////////////////////////////////////////////
    //////////////// Initialize helpers and scales ///////////////
    //////////////////////////////////////////////////////////////

    var num_songs = 2000,
        start_year = 1955,
        end_year = 2017;

    var outer_radius = width * 0.45,
        inner_radius = outer_radius * 2.2/7;
    var mini_circle_radius = 1 * size_factor;

    var step_size = 5.5 * size_factor;
    var color_red = "#CB272E"
    var axis = d3.range(0,80,10)

    //The angle of each year
    var angle = d3.scaleLinear()
        .domain([start_year, end_year])
        .range([0.075 * pi2, 1.055 * pi2])

    //Radius of the songs
	var radius_scale = d3.scaleSqrt()
        .domain([1,10,25,50,100,250,500,1000,2000])
        .range( [40,28,22,16,12,8,5,3,2].map(function(d) { return d * size_factor; }) );

    //The bigger the circle, the lower the opacity
    var opacity_scale = d3.scaleLinear()
        .domain([1,50,250,1000])
        .range([0.2,0.3,0.4,0.5])
        .clamp(true);

    //Line function to draw the lines between songs from the same artist
    var line = d3.lineRadial()
        .angle(function (d) { return d.angle; })
        .radius(function (d) { return d.radius; })

    //What language to show
    var lang = getQueryVariable("lang"); //nl or en
    if(lang === "nl") {
        d3.select(".credit.nl").style("display","flex");
        d3.selectAll(".sub-title.nl").style("display","inline");
        d3.selectAll(".explanation.nl").style("display","block");
        d3.selectAll(".credit.en, .sub-title.en, .explanation.en").style("display","none");
    }//if

    //////////////////////////////////////////////////////////////
    //////////////////// Set up hover voronoi ////////////////////
    //////////////////////////////////////////////////////////////

    var voronoi = d3.voronoi() 
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .extent([[-width/2, -height/2], [width/2, height/2]]);

    var diagram, polygons;

    //////////////////////////////////////////////////////////////
    ////////////////// Draw the vinyl in canvas //////////////////
    //////////////////////////////////////////////////////////////

    //Draw the big circle
    ctx.fillStyle = "rgb(30,30,30)";
    ctx.beginPath();
    ctx.arc(0, 0, outer_radius, 0, pi2, false);
    ctx.closePath();
    ctx.fill();
   
    //Based on https://codepen.io/pupismyname/pen/WvQEJR
    function create_vinyl_gradient(rotate,degrees,grey1,grey2) {
        var pieces = 120,
            size = degrees / pieces,
            min = 0 - degrees / 2; // low side of the arc

        ctx.globalCompositeOperation = "source-atop";
        for (var i = 0; i < pieces; i++) {
            var deg = i * size + rotate;
            var grey = parseInt((grey2 - grey1) * i / (pieces - 1) + grey1, 10);
            ctx.fillStyle = "rgb(" + grey + ", " + grey + ", " + grey + ")";
            ctx.strokeStyle = ctx.fillStyle;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            var x1 = (outer_radius * 10) * Math.cos(deg * pi / 180);
            var y1 = (outer_radius * 10) * Math.sin(deg * pi / 180);
            var x2 = (outer_radius * 10) * Math.cos((deg + size) * pi / 180);
            var y2 = (outer_radius * 10) * Math.sin((deg + size) * pi / 180);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 1 * size_factor;
            ctx.stroke(); // stroke covers up tiny gaps between slices caused by anti aliasing
        }//for i
    }//function create_vinyl_gradient

    var color_base = 30,
        color_highlight = 120,
        color_top_highlight = 220;

    var grad_start = -85,
        grad_length = 12,
        grey_length = 25;
    var grad_hl_start = -42,
        grad_hl_length = 1,
        highlight_length = 1;

    function draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight) {
        create_vinyl_gradient(grad_start,grad_length,color_base,color_highlight)
        create_vinyl_gradient(grad_start+grad_length,grey_length,color_highlight,color_highlight)
        create_vinyl_gradient(grad_start+grad_length+grey_length,grad_length,color_highlight,color_base)
    }//function draw_highlight

    //Top right gradients
    draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight)
    //draw_highlight(grad_hl_start, grad_hl_length, highlight_length, color_highlight, color_top_highlight)

    //Bottom left gradients
    ctx.rotate(Math.PI);
    draw_highlight(grad_start, grad_length, grey_length, color_base, color_highlight)
    //draw_highlight(grad_hl_start, grad_hl_length, highlight_length, color_highlight, color_top_highlight)
    ctx.rotate(-Math.PI);

    //Create light groove rings
    ctx.strokeStyle = "#212121";
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5 * size_factor;
    var track_step = 2.2 * size_factor;
    for(var i = 0; i < 210; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, inner_radius + track_step * i + Math.random(), 0, pi2, false);
        ctx.closePath();
        ctx.stroke();
    }//for i
    ctx.globalAlpha = 1;

    //Outer blank ring
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, outer_radius*1.009, 0, pi2, false);
    ctx.closePath();
    ctx.lineWidth = outer_radius*0.02;
    ctx.stroke();

    //Inner blank ring + red ring
    ctx.fillStyle = color_red;
    ctx.beginPath();
    ctx.arc(0, 0, inner_radius*0.93, 0, pi2, false);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = outer_radius*0.02;
    ctx.stroke();

    //Top white center circle
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.005, 0, pi2, false);
    ctx.closePath();
    ctx.fill();

    //Create track (axis) rings
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.75 * size_factor;
    for(var i = 0; i < axis.length; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, inner_radius + step_size * axis[i], 0, pi2, false);
        ctx.closePath();
        ctx.stroke();
    }//for i
    ctx.globalAlpha = 1;

    //////////////////////////////////////////////////////////////
    ////////////////// Create number count axis //////////////////
    //////////////////////////////////////////////////////////////

    //Add count axis text on top
    var axis_count_group = chart.append("g").attr("class", "axis-count-group");

    //Add the numbers along the axis circles
    axis_count_group.selectAll(".axis-count-label")
        .data(axis.filter(function(d,i) { return i !== 0 && i < axis.length - 1; }))
        .enter().append("text")
        .attr("class", "axis-count-label")
        .attr("transform", function(d) { 
            var rad = inner_radius + step_size * d;
            return "rotate(" + 29 + ")translate(0," + -rad + ")"; 
        })
        .attr("dy", "-0.4em")
        .style("font-size", (13 * size_factor) + "px")
        .text(function(d) { return d; });

    //Create paths for the axis title
    axis_count_group.selectAll("axis-path")
        .data([73.5,70.5])
        .enter().append("path")
        .attr("class", ".axis-path")
        .attr("id", function(d,i) { return "axis-path-" + i; })
        .style("display","none")
        .attr("d", function(d) {
            var rad = inner_radius + step_size * d; //radius
            return "M" + 0 + "," + -rad + " A" + rad + "," + rad + " 0 1 1 " + -0.01 + "," + -rad;
        });

    //Add title
    var axis_count_title = ["Number of songs in Top 2000","released in that year"]
    if (lang === "nl") axis_count_title = ["Aantal liedjes in de Top 2000","per jaar waarin ze zijn uitgebracht"]
    axis_count_group.selectAll(".axis-count-title")
        .data(axis_count_title)
        .enter().append("text")
        .attr("class", "axis-count-title")
        .attr("dy", "-0.4em")
        .style("font-size", (13 * size_factor) + "px")
        .append("textPath")
        .attr("xlink:href", function(d,i) { return "#axis-path-" + i; })
        .attr("startOffset", "8.2%")
        .text(function(d) { return d; });

    //////////////////////////////////////////////////////////////
    //////////////////// Add release year axis ///////////////////
    //////////////////////////////////////////////////////////////

    //Add year axis around the edges
    var year_axis = d3.range(1960,2020,5)
    var axis_year_group = chart.append("g").attr("class", "axis-year-group");
    //Add the year labels
    axis_year_group.selectAll(".axis-year-label")
        .data(year_axis)
        .enter().append("text")
        .attr("class", "axis-year-label")
        .attr("transform", function(d) { 
            var a = angle(d) * 180/pi - 180;
            return "rotate(" + a + ")translate(0," + (outer_radius * 0.97) + ")rotate(" + ((a > 90 && a < 270) || (a < -90) ? "180" : "0") + ")"; 
        })
        .attr("dy", "0.35em")
        .style("font-size", (14 * size_factor) + "px")
        .text(function(d) { return d; });

    //Create path for the axis explanation
    axis_year_group.append("path")
        .attr("class", "axis-year-path")
        .attr("id", "axis-year-path")
        .style("display","none")
        .attr("d", function(d) {
            var rad = outer_radius * 1.05;
            return "M" + 0 + "," + rad + " A" + rad + "," + rad + " 0 1 1 " + 0.01 + "," + rad;
        });
    //Add title to the path
    axis_year_group.append("text")
        .attr("class", "axis-year-title")
        .attr("dy", "0.35em")
        .style("font-size", (20 * size_factor) + "px")
        .append("textPath")
        .attr("xlink:href", "#axis-year-path")
        .attr("startOffset", "38%")
        .html(lang === "nl" ? "Jaar waarin het liedje is uitgebracht &#8594;" : "The release year of a song &#8594;");

    //////////////////////////////////////////////////////////////
    /////////////////// Add title in the center //////////////////
    //////////////////////////////////////////////////////////////

    var center_title_group = chart.append("g").attr("class", "center-title-group");
    //Create path for the text that goes around center
    center_title_group.append("path")
        .attr("class", "center-circle-path")
        .attr("id", "center-circle-path")
        .style("display","none")
        .attr("d", function(d) {
            var rad = inner_radius * 0.82;
            return "M" + -rad + "," + 0 + " A" + rad + "," + rad + " 0 1 1 " + -rad + "," + 0.01;
        });
    //Add title to the path
    center_title_group.append("text")
        .attr("class", "center-text-around")
        .attr("dy", "0.35em")
        .style("font-size", (12 * size_factor) + "px")
        .append("textPath")
        .attr("xlink:href", "#center-circle-path")
        .attr("startOffset", "0%")
        .text(lang === "nl" ? "Een visualisatie van alle 2000 nummers in NPO Radio 2's Top 2000. Elk nummer is geplaatst volgens jaar van uitgave. De Top 2000 is sinds 1999 op de radio te horen tussen Kerst en Oudjaarsavond"
        : "A visualization of all 2000 songs from NPO Radio 2's Top 2000. Each song is placed according to its release year. The Top 2000 has been on Dutch Radio between Christmas & New Year's since 1999");

    //Add TOP 2000 text
    var title = center_title_group.append("text")
        .attr("class", "center-title")
        .attr("dy", "0.35em")
        .attr("y", -inner_radius * 0.27)
        .style("font-size", (55 * size_factor) + "px")
        .text("TOP 2000");

    //////////////////////////////////////////////////////////////
    ////////////////// Add hover text in center //////////////////
    //////////////////////////////////////////////////////////////

    var hover_text_group = chart.append("g").attr("class", "hover-text-group");

    hover_text_group.append("text")
        .attr("class", "hover-text")
        .attr("dy", "0.35em")
        .attr("y", inner_radius * 0.12)
        .style("font-size", (14 * size_factor) + "px")
        .text(lang === "nl" ? "Presenteert" : "Presenting")

    var hover_artist = hover_text_group.append("text")
        .attr("class", "hover-text-artist")
        .attr("x", 0)
        .attr("y", inner_radius * 0.25)
        .attr("dy", "0.35em")
        .style("font-size", (22 * size_factor) + "px")
        .text(lang === "nl" ? "Alle 2000 nummers" : "All 2000 songs")
    
    hover_text_group.append("text")
        .attr("class", "hover-text")
        .attr("y", inner_radius * 0.41)
        .attr("dy", "0.35em")
        .style("font-size", (14 * size_factor) + "px")
        .text(lang === "nl" ? "met" : "with")

    var hover_song = hover_text_group.append("text")
        .attr("class", "hover-text-artist")
        .attr("x", 0)
        .attr("y", inner_radius * 0.51)
        .attr("dy", "0.35em")
        .style("font-size", (14 * size_factor) + "px")
        .text(lang === "nl" ? "hover|click op een cirkel..." : "hover|click a circle and see...")

    var hover_rank = hover_text_group.append("text")
        .attr("class", "hover-text")
        .attr("dy", "0.35em")
        .attr("y", inner_radius * 0.66)
        .style("font-size", (12 * size_factor) + "px")
        .text("")

    ///////////////////////////////////////////////////////////////////////////
    //////////////////////////// Add size legend //////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var size_legend_group = chart.append("g")
        .attr("class", "size-legend-group")
        .attr("transform", "translate(" + (-width/2 + 40 * size_factor) + "," + (-height/2 + 10 * size_factor) + ")");

    size_legend_group.append("text")
        .attr("class", "size-legend-title")
        .attr("x", -35 * size_factor)
        .attr("y", -55 * size_factor)
        .style("font-size", (15 * size_factor) + "px")
        .text(lang === "nl" ? "Positie in de Top 2000" : "Position in the Top 2000");

    //Add circles
    // var size_distance = [13, 86, 141, 184, 218, 246, 271, 296, 321];
    var size_distance = [0, 45, 80, 110, 140, 170, 200, 230, 260].map(function(d) { return d * size_factor; });
    var size_circles = size_legend_group.selectAll(".size-legend-circle")
        .data(radius_scale.range())
        .enter().append("circle")
        .attr("class", "size-legend-circle")
        .attr("cx", function (d, i) { return size_distance[i]; })
        .attr("r", function (d) { return d; })
        .style("stroke", function(d,i) { return i <= 1 ? color_red : null; })
        .style("stroke-width", 1.5 * size_factor)
    //Add white tiny circle in center
    size_legend_group.selectAll(".size-legend-circle-center")
        .data(size_distance)
        .enter().append("circle")
        .attr("class", "size-legend-circle-center")
        .attr("cx", function (d) { return d; })
        .attr("r", function(d,i) { return mini_circle_radius * (i < 4 ? 1.5 : 1); })

    //Add numbers below
    var size_font = [13, 12.5, 12, 12];
    size_legend_group.selectAll(".size-legend-label")
        .data(radius_scale.domain())
        .enter().append("text")
        .attr("class", "size-legend-label")
        .attr("x", function (d, i) { return size_distance[i]; })
        .attr("y", 65 * size_factor)
        .attr("dy", "0.35em")
        .style("font-size", function (d, i) { return i <= 3 ? (size_font[i] * size_factor) + "px" : (11 * size_factor) + "px"; })
        .text(function (d) { return d; })

    //////////////////////////////////////////////////////////////
    /////////////////////// Read in the data /////////////////////
    //////////////////////////////////////////////////////////////

    d3.queue()
        .defer(d3.csv, "data/top2000_2017_rank.csv")
        .defer(d3.csv, "data/top2000_2017_artist.csv")
        .await(draw);

    function draw(error, data, data_artist) {
        if (error) throw error;

        //////////////////////////////////////////////////////////////
        /////////////////////// Final data prep //////////////////////
        //////////////////////////////////////////////////////////////

        data.forEach(function (d,i) {
            d.rank = +d.rank;
            d.releaseYear = +d.releaseYear;
        })//forEach

        //Sort from lowest to highest song
        data.sort(function(a,b) { return b.rank - a.rank; });

        // //Sort alphabetically
        // data.sort(function(a, b){
        //     if(a.artist < b.artist) return -1;
        //     if(a.artist > b.artist) return 1;
        //     return 0;
        // })

        data_artist.forEach(function (d,i) {
            d.rank = +d.rank;
            d.releaseYear = +d.releaseYear;
        })//forEach

        //Just in case, take out any songs from before the start_year of the circle
        data = data.filter(function(d) { return d.releaseYear >= start_year; })
        data_artist = data_artist.filter(function(d) { return d.releaseYear >= start_year; })

        //////////////////////////////////////////////////////////////
        /////////////// Create the circles for each song /////////////
        //////////////////////////////////////////////////////////////

        ctx.fillStyle = "white";
        //Loop over each year and draw the year circles
        for(var i = start_year; i <= end_year; i++) {

            var data_year = data.filter(function(s) { return s.releaseYear === i; });
            var max_height = 0;
            var a = angle(i);

            //Draw two circles for each song
            data_year.forEach(function(s,j) {
                //Keep check of the maximum height for the axis line, if needed
                if(_.indexOf(year_axis, i) >= 0) max_height = inner_radius + step_size * j + radius_scale(s.rank);
        
                //Save some position variables
                s.angle = a;
                s.radius = inner_radius + step_size * j;
                //Rounding for the voronoi later, Otherwise it can throw errors
                s.x = _.round(s.radius * Math.cos(a - pi1_2),2);
                s.y = _.round(s.radius * Math.sin(a - pi1_2),2);

                //Draw the bigger - rank based circles
                ctx.globalAlpha = opacity_scale(s.rank);
                ctx.beginPath();
                ctx.arc(s.x, s.y, radius_scale(s.rank), 0, pi2, false);
                ctx.closePath();
                ctx.fill();
            })//forEach

            //Draw the tiny circles in the center of each song
            ctx.globalAlpha = 1;
            ctx.beginPath();
            data_year.forEach(function(s,j) {
                ctx.arc(s.x, s.y, mini_circle_radius, 0, pi2, false);
            })//forEach
            ctx.closePath();
            ctx.fill();

            //Add small lines to year axis
            if(_.indexOf(year_axis, i) >= 0) {
                ctx.strokeStyle = "#c1c1c1";
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1 * size_factor;

                ctx.rotate(a + pi);
                ctx.beginPath();
                ctx.moveTo(0, max_height + 4)
                ctx.lineTo(0, outer_radius * 0.95);
                ctx.closePath();
                ctx.stroke();
                ctx.rotate(-(a + pi));

                ctx.globalAlpha = 1;
            }//if
        }//for i

        //////////////////////////////////////////////////////////////
        /////////////////////// Mark top 10 songs ////////////////////
        //////////////////////////////////////////////////////////////

        //Group for the SVG hover drawings
        var chart_group = chart.append("g").attr("class","chart-group")

        //Add the top 10 in a stroke
        var top10_group = chart_group.append("g").attr("class","top-10-group");
        var top10 = top10_group.selectAll(".top-10-circle")
            .data(data.filter(function(d) { return d.rank <= 10; }))
            .enter().append("circle")
            .attr("class", "top-10-circle")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", function(d) { return radius_scale(d.rank); })
            .style("fill", "none")
            .style("stroke", color_red)
            .style("stroke-width", 1 * size_factor)
            .style("mix-blend-mode", "screen")


        //////////////////////////////////////////////////////////////
        /////////////////// Create top 10 annotations ////////////////
        //////////////////////////////////////////////////////////////

        document.querySelector('html').style.setProperty('--annotation-title-font-size', (14 * size_factor) + 'px')
        document.querySelector('html').style.setProperty('--annotation-label-font-size', (11 * size_factor) + 'px')

        // 1,"Bohemian Rhapsody","Queen",1975
        // 2,"Hotel California","Eagles",1977
        // 3,"Stairway To Heaven","Led Zeppelin",1971
        // 4,"Piano Man","Billy Joel",1974
        // 5,"Child In Time","Deep Purple",1972
        // 6,"Black","Pearl Jam",1991
        // 7,"Wish You Were Here","Pink Floyd",1975
        // 8,"Fix You","Coldplay",2005
        // 9,"Avond","Boudewijn de Groot",1997
        // 10,"November Rain","Guns N' Roses",1992

        var annotations = [
            {
                note: {
                    title: "1. Queen",
                    label: "Bohemian Rhapsody",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 304 * size_factor,
                y: 346 * size_factor,
                dx: 44 * size_factor,
                dy: 21 * size_factor
            },{
                note: {
                    title: "2. Eagles",
                    label: "Hotel California",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 231 * size_factor,
                y: 483 * size_factor,
                dx: -13 * size_factor,
                dy: 57 * size_factor
            },{
                note: {
                    title: "3. Led Zeppelin",
                    label: "Stairway To Heaven",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 466 * size_factor,
                y: 228 * size_factor,
                dx: 23 * size_factor,
                dy: -36 * size_factor
            },{
                note: {
                    title: "4. Billy Joel",
                    label: "Piano Man",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 278 * size_factor,
                y: 272 * size_factor,
                dx: 86 * size_factor,
                dy: 49 * size_factor
            },{
                note: {
                    title: "5. Deep Purple",
                    label: "Child In Time",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 379 * size_factor,
                y: 256 * size_factor,
                dx: 68 * size_factor,
                dy: 28 * size_factor
            },{
                note: {
                    title: "6. Pearl Jam",
                    label: "Black",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: -332 * size_factor,
                y: 267 * size_factor,
                dx: -41 * size_factor,
                dy: 18 * size_factor
            },{
                note: {
                    title: "7. Pink Floyd",
                    label: "Wish You Were Here",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: 270 * size_factor,
                y: 353 * size_factor,
                dx: 16 * size_factor,
                dy: 61 * size_factor
            },{
                note: {
                    title: "8. Coldplay",
                    label: "Fix You",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: -271 * size_factor,
                y: -255 * size_factor,
                dx: -21 * size_factor,
                dy: -34 * size_factor
            },{
                note: {
                    title: "9. Boudewijn de Groot",
                    label: "Avond",
                    padding: 5 * size_factor,
                    wrap: 250 * size_factor
                },
                className: "annotation-top-10",
                x: -398 * size_factor,
                y: 16 * size_factor,
                dx: -43 * size_factor,
                dy: -16 * size_factor
            },{
                note: {
                    title: "10. Guns N' Roses",
                    label: "November Rain",
                    padding: 5 * size_factor
                },
                className: "annotation-top-10",
                x: -374 * size_factor,
                y: 232 * size_factor,
                dx: -49 * size_factor,
                dy: -15 * size_factor
            }
        ];

        //Set-up the annotation maker
        var makeAnnotations = d3.annotation()
            //.editMode(true)
            .type(d3.annotationCalloutElbow)
            .annotations(annotations);

        //Call and create the textual part of the annotations
        var annotation_group = chart.append("g").attr("class", "annotation-group");
        annotation_group.call(makeAnnotations);

        //////////////////////////////////////////////////////////////
        //////////////////// Set-up hover interaction ////////////////
        //////////////////////////////////////////////////////////////

        svg.on("touchmove mousemove", function() {
            d3.event.stopPropagation();

            //Find the nearest song to the mouse, within a distance of X pixels
            var m = d3.mouse(this);
            var found = diagram.find(m[0] - width/2, m[1] - height/2, 50 * size_factor);

            if (found) { 
                d3.event.preventDefault();
                show_highlight_artist(found) 
            } else if(width < ww || ww > 500) { reset_chart() } //On a drag it doesn't reset for smaller screens

        })//on mousemove

        //Mostly for mobile - if you click anywhere outside of a circle, it resets
        svg.on("click", function() {
            d3.event.stopPropagation();

            //Find the nearest song to the mouse, within a distance of X pixels
            var m = d3.mouse(this);
            var found = diagram.find(m[0] - width/2, m[1] - height/2, 50 * size_factor);

            if (found) { show_highlight_artist(found) } 
            else { reset_chart() }//else
        })//on click

        //Mostly for mobile - to reset al when you click on mobile
        d3.select("body").on("click", reset_chart);

        //////////////////////////////////////////////////////////////
        //////////////// Create voronoi hover interaction ////////////
        //////////////////////////////////////////////////////////////

        diagram = voronoi(data);
        //Calculate the voronoi polygons
        // polygons = diagram.polygons();

        // //Draw the cells
        // ctx.beginPath();
        // for (var i = 0, n = polygons.length; i < n; ++i) {
        //     var cell = polygons[i];
        //     if (!cell) continue;
        //     ctx.moveTo(cell[0][0], cell[0][1]);
        //     for (var j = 1, m = cell.length; j < m; ++j) ctx.lineTo(cell[j][0], cell[j][1]);
        //     ctx.closePath();
        // }//for i
        // ctx.strokeStyle = "white";
        // ctx.stroke();

        //////////////////////////////////////////////////////////////
        ///////////////////// Interaction functions //////////////////
        //////////////////////////////////////////////////////////////

        //Function to highlight the hovered artist
        function show_highlight_artist(found) {
            //Remove the highlighting lines and circles
            chart_group.selectAll(".artist-circle-group, .artist-path").remove()
            hover_text_group.style("opacity", 0)
            
            //Hide top 10
            top10.style("opacity", 0)
            annotation_group.style("opacity", 0)
            size_circles.filter(function(d,i) { return i <= 1; })
                .style("stroke-opacity", 0)

            //////////////////////////////////////////////////////////////
            /////////////////////// Draw artist paths ////////////////////
            //////////////////////////////////////////////////////////////

            //Get all the songs from this artist or artists
            var artists = data_artist.filter(function(d) { return d.rank === data[found.index].rank; })

            //Number of Top 2000 songs per artist
            artists.forEach(function(d,i) {
                d.num_songs = data_artist.filter(function(a) { return a.artist === d.artist; }).length
            })//forEach
            //Sort from the artist with most songs to fewest
            artists.sort(function(a,b) { return b.num_songs - a.num_songs; });

            //Loop over each artist and draw a line
            var songs_unique = [];
            artists.forEach(function(d,i) {
                
                //Get this artists data and sort on release year and decreasing rank
                var artist = data_artist
                    .filter(function(a) { return a.artist === d.artist; })
                    .sort(function(a,b) { return a.releaseYear - b.releaseYear || b.rank - a.rank; });

                //Get the radius and angle
                artist.forEach(function(a,k) {
                    var original = _.find(data, function(o) { return o.rank === a.rank; })
                    a.radius = original.radius
                    a.angle = original.angle
                    songs_unique.push(a.rank)
                })//forEach

                //Add a line between all the songs of that artist
                if (artist.length > 1) {
                    // var path = "M"
                    // for (var k = 0; k < artist.length - 1; k++) {
                    //     var x1 = _.round(artist[k].x,2 ),
                    //         y1 = _.round(artist[k].y, 2),
                    //         x2 = _.round(artist[k+1].x, 2),
                    //         y2 = _.round(artist[k+1].y, 2),
                    //         dx = x1 - x2,
                    //         dy = y1 - y2;

                    //     var curve = _.round(Math.sqrt(dx * dx + dy * dy) * 0.53);

                    //     //Get the angles to determine the optimum sweep flag
                    //     var a1 = angle(artist[k].releaseYear),
                    //         a2 = angle(artist[k+1].releaseYear);
                    //     var da = (a2 - a1) / pi;

                    //     var sweepFlag = 1;
                    //     if ((da > -1 && da <= 0) || (da > 1 && da <= 2)) sweepFlag = 0;

                    //     //Add the new arced section to the path
                    //     path = path + x1 + "," + y1 + " A" + curve + "," + curve + " 0 0 " + sweepFlag + " ";
                    // }//for i
                    // //Complete the path
                    // path = path + x2 + "," + y2;

                    // //Draw the path
                    // chart_group.append("path")
                    //     .attr("class", "artist-path")
                    //     .attr("d", path)

                    //Draw the path
                    chart_group.append("path")
                        .datum(artist)
                        .attr("class", "artist-path")
                        .attr("d", line)
                        .style("stroke-width", 2 * size_factor)
                        .style("stroke-dasharray", i > 0 ? "0," + (5 * size_factor) : null)
                }//if

            })//forEach

            //////////////////////////////////////////////////////////////
            /////////////////////// Draw song circles ////////////////////
            //////////////////////////////////////////////////////////////

            //Get all the unique songs if these artists
            songs_unique = _.uniq(songs_unique);

            var songs = data.filter(function(s) { return _.indexOf(songs_unique,s.rank) >= 0; })

            //Now sort so the smallest circles are on top per release year
            songs.sort(function(a,b) { return a.releaseYear - b.releaseYear || a.rank - b.rank; });

            //Create group for the song circles
            var artist_circle_group = chart_group.append("g")
                .attr("class","artist-circle-group")
                .style("isolation", "isolate");
            //Make all the circles of that artist white & stroked
            artist_circle_group.selectAll(".artist-circle")
                .data(songs)
                .enter().append("circle")
                .attr("class", function (d) {
                    return "artist-circle" + (d.rank === data[found.index].rank ? " hovered-artist-circle" : "");
                })
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; })
                .attr("r", function (d) { return radius_scale(d.rank); })
                .style("stroke-width", function(d) { return (d.rank === data[found.index].rank ? 4 : 3) * size_factor; })

            //Make the center circle of the hovered song more visible
            artist_circle_group.append("circle")
                .attr("class", "artist-center-circle")
                .attr("cx", data[found.index].x)
                .attr("cy", data[found.index].y)
                .attr("r", mini_circle_radius * 2)

            //////////////////////////////////////////////////////////////
            ////////////////////// Adjust center text ////////////////////
            //////////////////////////////////////////////////////////////

            //Adjust the title in the center
            hover_text_group.style("opacity", 1)
            hover_artist
                .text(data[found.index].artist)
                .call(wrap, 2 * inner_radius * 0.7)
            hover_song
                .text(data[found.index].title)
                .call(wrap, 2 * inner_radius * 0.5)
            hover_rank.text( (lang === "nl" ? "positie |" : "rank | ") + data[found.index].rank)
        }//function show_highlight_artist

        //Function to reset all back to normal
        function reset_chart() {
            //Remove the highlighting lines and circles
            chart_group.selectAll(".artist-circle-group, .artist-path").remove()

            //Highlight the top 10 songs
            top10.style("opacity", 1)
            annotation_group.style("opacity", 1)
            size_circles
                .filter(function(d,i) { return i <= 1; })
                .style("stroke-opacity", 1)

            //Reset center text
            hover_artist.text(lang === "nl" ? "Alle 2000 nummers" : "All 2000 songs")
            hover_song.text(lang === "nl" ? "hover|click op een cirkel..." : "hover|click a circle and see...")
            hover_rank.text("")
        }//function reset_chart

    }//function draw

}//function create_top2000_visual

//////////////////////////////////////////////////////////////
////////////////////// Helper functions //////////////////////
//////////////////////////////////////////////////////////////

//https://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
    }
    return (false);
}//function getQueryVariable

//Break line when it no longer fits and add "..."
function wrap(text, width, heightLine) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = (typeof heightLine === "undefined" ? 1.6 : heightLine), // ems
            y = text.attr("y"),
            x = text.attr("x"),
            dy = parseFloat(text.attr("dy")),
            tspan = text
                .text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y)
                .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                line.push("...");
                tspan.text(line.join(" "));
                break;
            }//if
        }//while
    });
}//wrap