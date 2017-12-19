// TODO: Add data for hover highlight same band
// TODO: Annotate the top 10 songs?

// Finalize
// TODO: Turn all English words into Dutch version
// TODO: Fill in header meta data + create image for sharing

function create_top2000_visual() {

    var container = d3.select("#chart")
    //Remove all that was before
    container.selectAll("svg, canvas").remove();

    var pi2 = 2*Math.PI,
        pi = Math.PI,
        pi1_2 = Math.PI/2;

    ////////////////////////////////////////////////////////////// 
    ///////////////////////// Set up sizes ///////////////////////
    ////////////////////////////////////////////////////////////// 

    var base_width = 1400,
        base_height = 1400

    var ww = window.innerWidth,
        wh = window.innerHeight

    var width;
    if(wh < ww) {
        width = ww;
    } else {
        if(ww < 500) width = ww/0.5;
        else if(ww < 600) width = ww/0.6;
        else if(ww < 800) width = ww/0.7;
        else if(ww < 1100) width = ww/0.8;
        else width = ww/0.8;
    }//else
    width = Math.round(Math.min(base_width, width))
    var height = width

    //How much smaller is this visual than the original
    var size_factor = _.round(width/base_width,3)

    ////////////////////////////////////////////////////////////// 
    //////////////////////// Create SVG //////////////////////////
    ////////////////////////////////////////////////////////////// 

    container.style("height", height + "px");

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

    //Test for capturing mouse events
    var background_rect = chart.append("rect")
        .attr("class", "background-rect")
        .attr("x", -width/2)
        .attr("y", -height/2)
        .attr("width", width)
        .attr("height", height)

    //If the chart is wider than the screen, make sure the left side is flush with the window
    if(width > ww) {
        d3.selectAll("svg, canvas")
            .style("left", 0)
            .style("transform", "translate(0,0)")
    } else {
        d3.selectAll("svg, canvas")
            .style("left", "50%")
            .style("transform", "translateX(-50%)")
    }//else

    //////////////////////////////////////////////////////////////
    //////////////// Initialize helpers and scales ///////////////
    //////////////////////////////////////////////////////////////

    var num_songs = 2000,
        start_year = 1954,
        end_year = 2016;

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

    //What language to show
    var lang = getQueryVariable("lang"); //nl or en
    if(lang === "nl") {
        d3.select(".credit.nl").style("display","flex");
        d3.select(".sub-title.nl").style("display","inline");
        d3.selectAll(".credit.en, .sub-title.en").style("display","none");
    } else {
        d3.select(".credit.en").style("display","flex");
        d3.select(".sub-title.en").style("display","inline");
        d3.selectAll(".credit.nl, .sub-title.nl").style("display","none");
    }//else

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
    //Create paths for the axis
    axis_count_group.selectAll("axis-path")
        .data(axis)
        .enter().append("path")
        .attr("class", ".axis-path")
        .attr("id", function(d) { return "axis-path-" + d; })
        .style("display","none")
        .attr("d", function(d) {
            var rad = inner_radius + step_size * d; //radius
            return "M" + 0 + "," + -rad + " A" + rad + "," + rad + " 0 1 1 " + -0.01 + "," + -rad;
        });
    //Add text to axis paths
    axis_count_group.selectAll(".axis-label")
        .data(axis.filter(function(d,i) { return i !== 0; }))
        .enter().append("text")
        .attr("class", "axis-label")
        .attr("dy", "-0.4em")
        .style("font-size", (13 * size_factor) + "px")
        .append("textPath")
        .attr("xlink:href", function(d) { return "#axis-path-" + d; })
        .attr("startOffset", "8.2%")
        .text(function(d,i) { return i === axis.length-2 ? lang === "nl" ? "Aantal liedjes" : "Number of songs" : d; });

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
            var rad = outer_radius * 1.045;
            return "M" + 0 + "," + rad + " A" + rad + "," + rad + " 0 1 1 " + 0.01 + "," + rad;
        });
    //Add title to the path
    axis_year_group.append("text")
        .attr("class", "axis-year-title")
        .attr("dy", "0.35em")
        .style("font-size", (18 * size_factor) + "px")
        .append("textPath")
        .attr("xlink:href", "#axis-year-path")
        .attr("startOffset", "38%")
        .html(lang === "nl" ? "Jaar waarin het liedje is uitgekomen &#8594;" : "The release year of a song &#8594;");

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
        .text("TOP 2001");

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
        .attr("transform", "translate(" + (-width/2 + 70 * size_factor) + "," + (height/2 - 80 * size_factor) + ")");

    size_legend_group.append("text")
        .attr("class", "size-legend-title")
        .attr("x", -35 * size_factor)
        .attr("y", -50 * size_factor)
        .style("font-size", (16 * size_factor) + "px")
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
    var size_font = [14, 14, 13, 12];
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

d3.csv("data/top2000_2016.csv", function (error, data) {
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

    data = data.filter(function(d) { return d.releaseYear >= start_year; })

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
            s.x = s.radius * Math.cos(a - pi1_2);
            s.y = s.radius * Math.sin(a - pi1_2);
            //TODO Also save this information in the "artist" dataset

            //Draw the bigger - rank based circles
            ctx.globalAlpha = opacity_scale(s.rank);
            ctx.beginPath();
            ctx.arc(s.x, s.y, radius_scale(s.rank), 0, pi2, false);
            ctx.closePath();
            ctx.fill();

            //Draw the tiny circle in the center
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, mini_circle_radius, 0, pi2, false);
            ctx.closePath();
            ctx.fill();
        })//forEach


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
    //////////////// Create voronoi hover interaction ////////////
    //////////////////////////////////////////////////////////////

    //Calculate the voronoi polygons
    diagram = voronoi(data);
    polygons = diagram.polygons();

    // //Draw the cells
    // ctx.beginPath();
    // for (var i = 0, n = polygons.length; i < n; ++i) {
    //     var cell = polygons[i];
    //     if (!cell) continue;
    //     ctx.moveTo(cell[0][0], cell[0][1]);
    //     for (var j = 1, m = cell.length; j < m; ++j) ctx.lineTo(cell[j][0], cell[j][1]);
    //     ctx.closePath();
    // }//for i
    // ctx.strokeStyle = "#000";
    // ctx.stroke();

    //Line function to draw the lines between songs from the same artist
    var line = d3.lineRadial()
        .angle(function (d) { return d.angle; })
        .radius(function (d) { return d.radius; })

    // svg.on("touchmove mousemove", function () {
    //     d3.event.stopPropagation();
    //     //Find the nearest song to the mouse, within a distance of X pixels
    //     var m = d3.mouse(this);
    //     var found = diagram.find(m[0] - width/2, m[1] - height/2, 50 * size_factor);

    //     title.style("fill","blue"); 
    //     if (found) { 
    //         d3.event.preventDefault();
    //         show_highlight_artist(found) 
    //     } 
    //     else if(width < ww) { title.style("fill","green"); reset_chart() } //On a drag it doesn't reset for smaller screens

    // })//on mousemove

    //Mostly for mobile - if you click anywhere outside of a circle, it resets
    background_rect.on("mouseover click", function() {

        title.style("fill","orange");

        d3.event.stopPropagation();
        //Find the nearest song to the mouse, within a distance of X pixels
        var m = d3.mouse(this);
        var found = diagram.find(m[0], m[1], 50 * size_factor);
        // var found = diagram.find(m[0] - width/2, m[1] - height/2, 50 * size_factor);

        if (found) { show_highlight_artist(found) } 
        else { title.style("fill","pink"); reset_chart() }
    })//on click

    //Mostly for mobile - to reset al when you click on mobile
    //d3.select("body").on("click", reset_chart);

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
        size_circles.filter(function(d,i) { return i <= 1; })
            .style("stroke-opacity", 0)

        //Get all the songs from this artist
        var artist = data
            .filter(function(d) { return d.artist === data[found.index].artist; })
            .sort(function(a,b) { return a.releaseYear - b.releaseYear || b.rank - a.rank; });

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
        }//if

        //Now sort so the smallest circles are on top per release year
        artist.sort(function(a,b) { return a.releaseYear - b.releaseYear || a.rank - b.rank; });

        //Make all the circles of that artist white & stroked
        var artist_circle_group = chart_group.append("g")
            .attr("class","artist-circle-group")
            .style("isolation", "isolate");

        artist_circle_group.selectAll(".artist-circle")
            .data(artist)
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
        hover_text_group.style("opacity", 0)

        //Highlight the top 10 songs
        top10.style("opacity", 1)
        size_circles
            .filter(function(d,i) { return i <= 1; })
            .style("stroke-opacity", 1)
    }//function reset_chart

})//d3.csv

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