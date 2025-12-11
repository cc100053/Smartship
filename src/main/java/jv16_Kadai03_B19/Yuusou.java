package jv16_Kadai03_B19;

import java.io.Serializable;

public class Yuusou implements Serializable{
	private int W, D, H;
	private double Weight;
	private String judge;
	
	public int getW() {return this.W;}
	public void setW(int W) {this.W = W;}
	
	public int getD() {return this.D;}
	public void setD(int D) {this.D = D;}
	
	public int getH() {return this.H;}
	public void setH(int H) {this.H = H;}
	
	public double getWeight() {return this.Weight;}
	public void setWeight(double Weight) {this.Weight = Weight;}
	
	public String getJudge() {return this.judge;}
	public void setJudge(String judge) {this.judge = judge;}

}
