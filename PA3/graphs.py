
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.pyplot import figure
import json, collections, csv

ax = plt.axes()

# read from metrics.json
def js_r(filename: str):
    with open(filename) as f_in:
        return json.load(f_in)

my_data = js_r('metrics_PublicNTP.json')
keys = []
delay_values = {}
offset_values = {}
theta_values = {}
delta_values = {}
T1 = {}
T2 = {}
T3 = {}
T4 = {}
for key, values in my_data.items():
    delay_values[key]=values["d"]
    offset_values[key]=values["t"]
    T1[key] = values["originateTimestamp"]
    T2[key] = values["rxTimestamp"]
    T3[key] = values["txTimestamp"]
    T4[key] = values["destinationTimestamp"]

#sort the graph accordingly
od_delay_values = collections.OrderedDict(sorted(delay_values.items()))
od_offset_values = collections.OrderedDict(sorted(offset_values.items()))

# generate the theta values
cnt = 0
theta_so_far = list(od_delay_values.values())[0]
for k,v in od_delay_values.items():
    if cnt%8 == 0:
        theta_so_far = list(od_delay_values.values())[cnt]
    else:
        theta_so_far = min(theta_so_far, v)
    theta_values[k]=theta_so_far
    cnt+=1

# generate the delta values
cnt=0
delta_so_far = list(od_offset_values.values())[0]
for k,v in od_offset_values.items():
    if cnt%8 == 0:
        delta_so_far = list(od_offset_values.values())[cnt]
    else:
        delta_so_far = min(delta_so_far, v)
    delta_values[k]=delta_so_far
    cnt+=1

# populate the keys list
for k,v in od_delay_values.items():
    key = int(k.split(":")[0])*8+int(k.split(":")[1])
    keys.append(key)

# print the keys
print("================================================================================================")
print("keys")
print(keys)
print("================================================================================================")
print("T1")
od_T1 = collections.OrderedDict(sorted(T1.items()))
print(od_T1)
print("================================================================================================")
print("T2")
od_T2 = collections.OrderedDict(sorted(T2.items()))
print(od_T2)
print("================================================================================================")
print("T3")
od_T3 = collections.OrderedDict(sorted(T3.items()))
print(od_T3)
print("================================================================================================")
print("T4")
od_T4 = collections.OrderedDict(sorted(T4.items()))
print(od_T4)
print("================================================================================================")

with open('T1.csv', 'w') as csv_file:  
    writer = csv.writer(csv_file)
    writer.writerow(["(Burst #:Message #)", "NTP Timestamp"])
    for key, value in od_T1.items():
       writer.writerow(["("+str(key).split(":")[0]+":"+str(key).split(":")[1]+")", value])

with open('T2.csv', 'w') as csv_file:  
    writer = csv.writer(csv_file)
    writer.writerow(["(Burst #:Message #)", "NTP Timestamp"])
    for key, value in od_T2.items():
       writer.writerow(["("+str(key).split(":")[0]+":"+str(key).split(":")[1]+")", value])

with open('T3.csv', 'w') as csv_file:  
    writer = csv.writer(csv_file)
    writer.writerow(["(Burst #:Message #)", "NTP Timestamp"])
    for key, value in od_T3.items():
       writer.writerow(["("+str(key).split(":")[0]+":"+str(key).split(":")[1]+")", value])

with open('T4.csv', 'w') as csv_file:  
    writer = csv.writer(csv_file)
    writer.writerow(["(Burst #:Message #)", "NTP Timestamp"])
    for key, value in od_T4.items():
       writer.writerow(["("+str(key).split(":")[0]+":"+str(key).split(":")[1]+")", value])

print("Delay Values")
cnt=0
for k, v in od_delay_values.items(): 
    print(k, v)
    if cnt%8==7:
        print("--------------------------------")
    cnt+=1
print("================================================================================================")

print("Theta Values")
cnt=0
for k, v in theta_values.items(): 
    print(k, v)
    if cnt%8==7:
        print("--------------------------------")
    cnt+=1
print("================================================================================================")

print("Offset Values")
cnt=0
for k, v in od_offset_values.items(): 
    print(k, v)
    if cnt%8==7:
        print("--------------------------------")
    cnt+=1
print("================================================================================================")

print("Delta Values")
cnt=0
for k, v in delta_values.items(): 
    print(k, v)
    if cnt%8==7:
        print("--------------------------------")
    cnt+=1
print("================================================================================================")

# draw delay graph
#plt.gca().set_prop_cycle(color=['red', 'green','yellow','black'])
plt.rcParams["figure.figsize"] = (14,10)
figure, axis = plt.subplots(2, 2)

axis[0, 0].plot(list(od_delay_values.keys()),list(od_delay_values.values()))
axis[0, 0].set_title("Delay")
axis[0, 0].set_xticks(list(od_delay_values.keys())[::8])

axis[1, 0].plot(od_offset_values.keys(),list(od_offset_values.values()))
axis[1, 0].set_title("Offset")
axis[1, 0].set_xticks(list(od_delay_values.keys())[::8])

axis[0, 1].plot(theta_values.keys(),list(theta_values.values()))
axis[0, 1].set_title("Theta")
axis[0, 1].set_xticks(list(od_delay_values.keys())[::8])

axis[1, 1].plot(delta_values.keys(),list(delta_values.values()))
axis[1, 1].set_title("Delta")
axis[1, 1].set_xticks(list(od_delay_values.keys())[::8])

figure.text(0.28, 0.05, '<Burst #, Message #> vs Time in secs', fontsize = 20, color = "green")
plt.xticks()
plt.savefig('delay.png')

# Get the T1, T2, T3, T4


# Heat Map
# Check that

#xline = np.array(burst_val)
#yline = np.array(msg_pair)
#zline = np.cos(offset_val)
#ax.set_xlabel('Burst Values')
#ax.set_ylabel('Message Pair Values')
#ax.set_zlabel('Offset Values')
#ax.scatter3D(xline, yline, zline, 'gray')
#plt.savefig('foo.png')

# making list of tuples
'''
figure(figsize=(14, 10), dpi=80)
burst_msg_list = [8*burst_val[i]+msg_pair[i] for i in range(len(burst_val))]
print(burst_msg_list)
burst_msg_str = ["("+str(burst_val[i])+str(",")+ str(msg_pair[i])+")" for i in range(len(burst_val))]
print(burst_msg_str)
plt.xticks(rotation=90)
ax.set_xticks(burst_msg_list)
ax.set_xticklabels(burst_msg_str)
plt.plot(burst_msg_list, offset_val)
print(len(burst_msg_list), len(burst_msg_str))
plt.savefig('foo_2D.png')
'''