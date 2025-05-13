import numpy as np
import pandas as pd
import geopandas as gpd
import shapely.geometry
import contextily as cx
import matplotlib.pyplot as plt
import plotly.express as px
import os
import calendar
import json

from datetime import date, timedelta

"""
Need:

Environmental data:
* Water Consumption
* Airborne pollutants
* Soil measurements?

Jobs Data:
* Union Jobs Created
* Job training programs
* How many jobs are local
"""

stockton_lat_lon_center = (37.961632, -121.275604)

# grid params
step_size_meters = 200
num_cells = 10

pollution_n_days = 365

save_dir = 'data'

def get_sequential_past_days(n_days: int) -> list:
    today = date.today()

    return [today - timedelta(days=n) for n in range(n_days + 1)]


def make_grid(center_lon: float, center_lat: float, step_size: int, num_cells: int):
    """
    From this post:

    https://gis.stackexchange.com/a/469732/307772
    """

    center_point = shapely.geometry.Point(center_lon, center_lat)
    gdf = gpd.GeoDataFrame(geometry=[center_point], crs=4326)
    gdf = gdf.to_crs(gdf.estimate_utm_crs())

    x_center = gdf.geometry.iloc[0].x
    y_center = gdf.geometry.iloc[0].y

    x_start = x_center - step_size * (num_cells-1)
    x_end = x_center + step_size * num_cells

    y_start = y_center - step_size * (num_cells-1)
    y_end = y_center + step_size * num_cells

    x_coords = np.arange(start=x_start, stop=x_end, step=step_size)
    y_coords = np.arange(start=y_start, stop=y_end, step=step_size)

    coords = np.array(np.meshgrid(x_coords, y_coords)).T.reshape(-1,2)

    centerpoints = gpd.points_from_xy(x=coords[:,0], y=coords[:,1])
    squares = [p.buffer(distance=step_size, cap_style=3) for p in centerpoints]
    centerpoints_gdf = gpd.GeoDataFrame(geometry=centerpoints, crs=gdf.crs)
    grid_gdf = gpd.GeoDataFrame(geometry=squares, crs=gdf.crs)

    # convert back to lat lon
    gdf = gdf.to_crs(4326)
    grid_gdf = grid_gdf.to_crs(4326)
    centerpoints_gdf = centerpoints_gdf.to_crs(4326)


    return gdf, grid_gdf, centerpoints_gdf

def simulate_pollution_data(row: pd.Series, data_size: int):
    """Returns 3 seperate numpy arrays (representing time series) for 3 different simualted pollution amounts
    
    pollutant distribution limits estimated from fig 7 and fig 3 from this paper: https://www.sciencedirect.com/science/article/pii/S1352231022000012

    It would be better to refactor this to be more general isntead of card-coding 3 different pollution types
    """
    # instantiate a different mode for each point
    pm25_mode = row['PM_2.5_mode'] if 'PM_2.5_mode' in row.index else 5
    bc_mode = row['Black_carbon_mode'] if 'Black_carbon_mode' in row.index else 0.5
    ufp_mode = row['UFP_mode'] if 'UFP_mode' in row.index else 4000

    row['PM_2.5'] = np.random.triangular(2.0, pm25_mode, pm25_mode + 20, data_size)
    row['Black_carbon']= np.random.triangular(0.1, bc_mode, bc_mode + 1, data_size)
    row['Ultrafine_particulate'] = np.random.triangular(2000, ufp_mode, ufp_mode + 2000, data_size)

    return row

if __name__ == "__main__":
    center_gdf, grid_gdf, centerpoints = make_grid(stockton_lat_lon_center[1], stockton_lat_lon_center[0], step_size_meters, num_cells)

    ax = center_gdf.plot(color='r', markersize=200, figsize=(15,15), zorder=1)
    grid_gdf.boundary.plot(ax=ax, zorder=0)

    # make up pollution data for each lat lon
    pollution_dates = get_sequential_past_days(pollution_n_days)
    pollution_gdfs = []

    centerpoints.reset_index(names='location_id').to_file(os.path.join(save_dir, 'pollution_locations.json'), driver='GeoJSON')

    # add columns to set the mode for each pollution measurement location
    size = centerpoints.shape[0]

    centerpoints['PM_2.5_mode'] = np.random.uniform(2, 75, size=size)
    centerpoints['Black_carbon_mode'] = np.random.uniform(.2, .75, size=size)
    centerpoints['UFP_mode'] = np.random.uniform(3000, 9000, size=None)


    for date_val in pollution_dates:

        gdf = centerpoints.copy()
        gdf['Date'] = date_val

        gdf = gdf.apply(lambda x: simulate_pollution_data(x, None), axis=1)
        gdf = gdf.reset_index(names='location_id')

        pollution_gdfs.append(gdf)

    pollution_gdf = pd.concat(pollution_gdfs)
    print(pollution_gdf.head())

    # plot pm2.5
    plot_gdf = pollution_gdfs[0]
    fig = px.density_map(plot_gdf, lat=plot_gdf.geometry.y, lon=plot_gdf.geometry.x, z='PM_2.5', zoom=13)

    fig.show()

    pollution_gdf.melt(['geometry', 'location_id', 'Date'], ['PM_2.5', 'Black_carbon', 'Ultrafine_particulate'], 'Pollutant', 'Pollutant_amount').to_file(os.path.join(save_dir, 'pollution.json'), driver='GeoJSON')
    # pollution_gdf.melt(['geometry', 'Date'], ['PM_2.5', 'Black_carbon', 'Ultrafine_particulate'], 'Pollutant', 'Pollutant_amount').to_csv(os.path.join(save_dir, 'pollution.csv'))


    # water data
    baseline_water_per_tonne_co2 = 4
    tonnes_c02_per_year = 500000
    tonnes_c02_per_month = tonnes_c02_per_year / 12

    months = [calendar.month_name[i] for i in range(1, 13)]
    period = 12 * 2 # half a sine wave, consumption peaks halfway through calendar year
    amplitude = 2
    seasonality = amplitude * np.sin(2 * np.pi * np.arange(1, len(months) + 1) / period)
    noise = np.random.normal(0, 0.25, len(months))

    # Energy Use
    # Current DAC systems have significant enrgy demands ranging 1500-3000 kWh per ton CO2 http://large.stanford.edu/courses/2024/ph240/cranmer1/
    baseline_energy_per_tonne_co2 = (3000 - 1500) / 2
    energy_seasonality = amplitude * np.sin(2 * np.pi * np.arange(1, len(months) + 1) / period)
    energy_noise = np.random.normal(0, 0.25, len(months))


    water_data = (baseline_water_per_tonne_co2 + seasonality + noise) * tonnes_c02_per_month
    energy_data = (baseline_energy_per_tonne_co2 + energy_seasonality + energy_noise) * tonnes_c02_per_month
    consumption_df = pd.DataFrame({'month':months, 'water_consumption_tonnes':water_data, 'energy_consumption_kWh':energy_data})
    print(consumption_df)
    consumption_df.to_json(os.path.join(save_dir, 'resource_consumption.json'))

    plt.clf()
    fig, axes = plt.subplots(2, 1, sharex=True)
    ax1 = axes[0]
    ax2 = axes[1]

    ax1.plot(months, water_data, label='water')
    ax1.set_ylabel('Water Consumption (Tonnes)')
    ax1.legend()

    ax2.plot(months, energy_data, label = 'energy', color='#FFA500')
    ax2.set_xlabel('Month')
    ax2.set_ylabel('Energy Use')
    ax2.legend()

    plt.title('Simulated DACS Water Consumption')
    plt.show()
    plt.close()

    # jobs data
    # total jobs created
    # percent union jobs
    # 






